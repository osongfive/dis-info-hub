import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { query, answer, sources, cacheToken } = await req.json();

    if (!query || !answer || !cacheToken) {
      return NextResponse.json({ error: 'Missing query, answer, or cacheToken' }, { status: 400 });
    }

    // Security: Verify the cacheToken to ensure the request originated from our /api/chat
    const internalSecret = process.env.SUPABASE_SECRET_KEY || 'dis-internal-secret';
    const expectedToken = crypto.createHmac('sha256', internalSecret).update(query.trim()).digest('hex');

    if (cacheToken !== expectedToken) {
      return NextResponse.json({ error: 'Invalid cache token' }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY!;
    const supabase = createClient(supabaseUrl, supabaseSecret);

    const hfToken = process.env.HF_ACCESS_TOKEN;
    if (!hfToken) {
        return NextResponse.json({ error: 'Missing HF_ACCESS_TOKEN' }, { status: 500 });
    }
    const hf = new HfInference(hfToken);

    // Generate embedding for the query to store in the cache for potential semantic lookup later
    const embedding = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: query,
    }) as number[];

    const { error } = await supabase.from('search_cache').upsert({
      query_text: query.trim(),
      answer_text: answer,
      sources: sources || [],
      embedding: embedding
    }, { onConflict: 'query_text' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in cache-answer API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
