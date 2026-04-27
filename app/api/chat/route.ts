import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { HfInference } from '@huggingface/inference';
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

    // Use centralized admin client for all DB operations in this route
    const supabase = createAdminClient();
    
    const hfToken = process.env.HF_ACCESS_TOKEN;
    if (!hfToken) {
      return NextResponse.json({ error: 'Missing HF_ACCESS_TOKEN' }, { status: 500 });
    }
    const hf = new HfInference(hfToken);

    // 1. Check for EXACT match in cache first (Zero Latency path)
    // F-04: Ignore entries older than 7 days to avoid stale answers
    const cacheTTL = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cachedHit } = await supabase
      .from('search_cache')
      .select('answer_text, sources')
      .eq('query_text', query.trim())
      .gte('created_at', cacheTTL)
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
        
    const { data: rawChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedding,
      match_count: 15,
      category_filter: categoryFilter,
    });

    if (matchError) throw matchError;

    // P-01: Filter out low-relevance chunks. null-guard preserves compatibility
    // with RPC versions that don't expose a similarity score column.
    const SIMILARITY_THRESHOLD = 0.3;
    const matchedChunks = (rawChunks || []).filter(
      (c: any) => c.similarity == null || c.similarity >= SIMILARITY_THRESHOLD
    );

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
    // P-04: Compressed prompt — saves ~120 tokens per request
    const systemPrompt = `You are the DIS Info Hub Assistant. Answer using ONLY the provided documents.
Reply in the same language as the question (English or Korean, never mix). Do not include meta-discussion.
Be detailed: extract exact colors, room numbers, times. Use markdown (bullet points, **bold**, ## headings).`;

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

    // F-01: Per-model timeout via AbortController. Fallback on 429, 503, and timeouts.
    let selectedModel = '';
    for (const model of modelChain) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s per model
      try {
        aiStream = await groq.chat.completions.create(
          {
            model: model,
            messages: messages,
            temperature: 0.1,
            stream: true,
          },
          {
            // @ts-ignore — Groq SDK forwards the signal to the underlying fetch
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
        selectedModel = model;
        break; // Success — exit the fallback loop.
      } catch (error: any) {
        clearTimeout(timeoutId);
        const isRetryable =
          error?.status === 429 ||
          error?.status === 503 ||
          error?.name === 'AbortError';
        if (isRetryable) {
          console.warn(`[Groq] ${error?.name ?? error?.status} on ${model}, falling back to next model...`);
          continue;
        }
        console.error(`[Groq] Non-retryable error on ${model}:`, error);
        throw error;
      }
    }

    if (!aiStream) {
      throw new Error("All AI models are currently overwhelmed or unavailable.");
    }

    // 8. Stream the response and cache when finished
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Output sources + the model that served this response first
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'init', sources: uniqueSources, model: selectedModel }) + '\n'));
        
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
          // U-01: Signal the client that the stream was interrupted, rather than closing silently.
          console.error("Error while streaming chunks:", streamErr);
          controller.enqueue(encoder.encode(
            JSON.stringify({ type: 'error', message: 'Response was interrupted. Please try again.' }) + '\n'
          ));
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
