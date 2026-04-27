import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Rate-limit: 20 feedback submissions per minute per IP
  const { success } = rateLimit(req, { limit: 20, windowMs: 60000 });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const { rating, preview } = await req.json();

    if (!rating || !['positive', 'negative'].includes(rating)) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from('feedback').insert({
      rating,
      // Store a trimmed preview of the AI response for admin review
      preview: (preview || '').slice(0, 300),
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[feedback] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
