import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { query, category, searchQuery } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query param' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Generate a cache token to secure the /api/cache-answer endpoint
    const internalSecret = process.env.SUPABASE_SECRET_KEY || 'dis-internal-secret';
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
    const textToEmbed = searchQuery || query;
    
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

    return NextResponse.json({
      context: contextText,
      sources: uniqueSources,
      cached: false,
      cacheToken: cacheToken
    });
    
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
