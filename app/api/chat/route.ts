import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import crypto from 'crypto';
import { rateLimit } from '@/lib/rate-limit';
import Groq from 'groq-sdk';


export async function POST(req: NextRequest) {
  try {
    // 0. Rate Limiting
    const { success, reset } = rateLimit(req, { limit: 15, windowMs: 60000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    const { query, category, searchQuery } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query param' }, { status: 400 });
    }

    // Input Validation: Limit query length
    if (query.length > 500) {
      return NextResponse.json({ error: 'Query is too long (max 500 characters)' }, { status: 400 });
    }


    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Validate that the secret key is configured (no fallback — fail loudly)
    const internalSecret = process.env.SUPABASE_SECRET_KEY;
    if (!internalSecret) {
      console.error('SUPABASE_SECRET_KEY is not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const cacheToken = crypto.createHmac('sha256', internalSecret).update(query.trim()).digest('hex');
    
    const hfToken = process.env.HF_ACCESS_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'Missing HF_ACCESS_TOKEN' }, { status: 500 });
    }
    const hf = new HfInference(hfToken);

    // 1. Check for EXACT match in cache first (Zero Latency path)
    const { data: cachedHit } = await supabase
      .from('search_cache')
      .select('answer_text, sources')
      .eq('query_text', query.trim())
      .single();

    if (cachedHit) {
      return NextResponse.json({
        answer: cachedHit.answer_text,
        sources: cachedHit.sources,
        cached: true
      });
    }

    // 2. Parallelize: Embedding generation and Logging
    // Use searchQuery (translated) if provided, otherwise use original query
    let textToEmbed = searchQuery || query;
    const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(query);
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    if (isKorean && !searchQuery) {
      try {
        const transRes = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant', // Fast model for simple translation
          messages: [{ role: 'user', content: `Translate this school-related question into a concise English search query for a document database. Just provide the English translation, nothing else.\n\nQuestion: ${query}` }]
        });
        if (transRes.choices?.[0]?.message?.content) {
          textToEmbed = transRes.choices[0].message.content.trim();
        }
      } catch (e) {
        console.warn("Groq translation failed", e);
      }
    }
    
    const [embedding] = await Promise.all([
      hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: textToEmbed,
      }) as Promise<number[]>,
      supabase.from('search_queries').insert({ query }) // Logging is non-blocking
    ]);

    // 3. Search document_chunks (using NEW optimized RPC with metadata)
    const categoryFilter =
      typeof category === 'string' && category.trim().length > 0 && category !== 'all'
        ? category.trim()
        : null;
        
    const { data: matchedChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 15, // INCREASED from 8 to 15 to ensure we get specific details (colors, patterns)
      category_filter: categoryFilter,
    });

    if (matchError) throw matchError;

    // 4. Calendar Integration (NEW)
    // Check if the query is related to dates or events
    const dateKeywords = ['calendar', 'event', 'when', 'date', 'schedule', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'break', 'holiday'];
    const isDateRelated = dateKeywords.some(kw => query.toLowerCase().includes(kw));
    
    let calendarContext = "";
    let calendarSources: any[] = [];

    if (isDateRelated) {
      const now = new Date().toISOString();
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('end_time', now)
        .order('start_time', { ascending: true })
        .limit(20);

      if (events && events.length > 0) {
        calendarContext = "\n\nUPCOMING SCHOOL EVENTS AND CALENDAR:\n" + events.map(e => {
          const start = new Date(e.start_time).toLocaleDateString();
          return `- ${e.title} (${start})${e.location ? ' @ ' + e.location : ''}${e.description ? ': ' + e.description : ''}`;
        }).join('\n');
        
        calendarSources.push({
          title: "Official School Calendar (Live Feed)",
          category: "Calendar",
          preview: "Live school events synced from the official DIS calendar.",
          fileUrl: "https://www.dis.sc.kr/quicklinks/calendar"
        });
      }
    }

    // 5. Gather context and sources efficiently
    const contextText = matchedChunks.map((c: any) => c.content).join('\n\n') + calendarContext;
    
    // Map chunks to docs using metadata already in the RPC response
    const docSources = matchedChunks.map((chunk: any) => ({
      title: chunk.document_title || 'Unknown Document',
      category: chunk.document_category || 'General',
      preview: chunk.content.substring(0, 150) + '...',
      fileUrl: chunk.document_file_url || null,
    }));

    // Deduplicate sources by title
    const uniqueSources = Array.from(new Map([...docSources, ...calendarSources].map((s: any) => [s.title, s])).values());

    // 6. Security: Define System Prompt Server-Side
    const systemPrompt = `You are the DIS Information Hub Assistant—an authoritative, helpful, and highly detailed school guide. Your primary mission is to synthesize the provided official school documents into a clear, comprehensive answer.

STRICT LANGUAGE RULE:
- **IDENTIFY THE LANGUAGE** of the "Student Question" first.
- **IF THE QUESTION IS IN ENGLISH:** You MUST respond in English.
- **IF THE QUESTION IS IN KOREAN:** You MUST respond in Korean.
- NEVER mix languages.
- **CRITICAL:** DO NOT include any meta-discussion or internal reasoning in your final response.

CONTENT & STYLE RULES:
- **BE AUTHORITATIVE & DETAILED:** Extract EVERY SPECIFIC DETAIL (exact colors, room numbers, materials, specific times).
- **STRICT GROUNDING:** Base your answers ONLY on the provided documents.
- **FORMATTING:** Use bullet points, numbered lists, and **bold** for key terms.
- **STRUCTURE:** Use "## Headings" to organize long answers.`;

    // 7. Triple-Level Guard (Smart Routing with Streaming)
    const modelChain = [
      'llama-3.3-70b-versatile',
      'mixtral-8x7b-32768',
      'llama-3.1-8b-instant'
    ];

    let aiStream: any = null;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: `Document Context:\n${contextText}\n\nStudent Question:\n${query}` }
    ];

    for (const model of modelChain) {
      try {
        aiStream = await groq.chat.completions.create({
          model: model,
          messages: messages,
          temperature: 0.1, // Keep answers highly factual
          stream: true,
        });
        break; // Success! Exit the fallback loop.
      } catch (error: any) {
        if (error?.status === 429) {
          console.warn(`[Groq] Rate limited on ${model}, falling back to next model...`);
          continue; // Try the next model
        }
        console.error(`[Groq] Error on ${model}:`, error);
        throw error; // If it's a real error (like 500 or auth), fail the request.
      }
    }

    if (!aiStream) {
      throw new Error("All AI models are currently overwhelmed or unavailable.");
    }

    // 8. Stream the response and cache when finished
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Output sources first so the UI can display them immediately
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'init', sources: uniqueSources }) + '\n'));
        
        let fullAnswer = "";
        
        try {
          for await (const chunk of aiStream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullAnswer += content;
              controller.enqueue(encoder.encode(JSON.stringify({ type: 'chunk', text: content }) + '\n'));
            }
          }
        } catch (streamErr) {
          console.error("Error while streaming chunks:", streamErr);
        }

        // Cache Answer asynchronously after stream finishes
        if (query.trim() && fullAnswer.trim()) {
          supabase.from('search_cache').insert({
            query_text: query.trim(),
            answer_text: fullAnswer,
            sources: uniqueSources,
            created_by: 'system_router' 
          }).then(({ error }) => {
            if (error) console.error("Cache save error:", error);
          });
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
