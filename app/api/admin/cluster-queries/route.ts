import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { queries, force } = await req.json();
    const supabase = createAdminClient();

    // 1. Check Cache unless forced
    if (!force) {
      const { data: cached } = await supabase
        .from('analytics_cache')
        .select('*')
        .eq('key', 'top_questions')
        .single();

      if (cached) {
        const updatedAt = new Date(cached.updated_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        // If data is less than 24 hours old, return it
        if (now - updatedAt < oneDay) {
          return NextResponse.json({ clusters: cached.data.clusters, cached: true });
        }
      }
    }
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ clusters: {} });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    // Group unique queries to minimize token usage
    const uniqueQueries = Array.from(new Set(queries as string[]))
      .filter(q => q.length > 2)
      .slice(0, 40);

    const prompt = `You are a data analyst for a school. I will provide you with a list of search queries. 
Group similar or related queries together under a single "Topic Label". 
Example: "What is the dress code?" and "Can I wear jeans?" should both be labeled "Uniform & Dress Code".

Return ONLY a JSON object where each key is an original query from my list, and the value is its corresponding Topic Label.
The Topic Label should be professional and concise (2-4 words).

List of Queries:
${uniqueQueries.join('\n')}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that clusters text into semantic categories and returns ONLY JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const clusters = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 2. Update Cache
    await supabase.from('analytics_cache').upsert({
      key: 'top_questions',
      data: { clusters }
    }, { onConflict: 'key' });

    return NextResponse.json({ clusters });
  } catch (error: any) {
    console.error('[cluster-queries] Error:', error);
    return NextResponse.json({ error: 'Failed to cluster queries' }, { status: 500 });
  }
}
