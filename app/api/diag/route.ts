import { NextResponse } from 'next/server';

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  
  const diagnostics: any = {
    url_analysis: {
      raw: rawUrl,
      length: rawUrl.length,
      // Check every single character code to find hidden non-ASCII characters
      charCodes: rawUrl.split('').map(c => c.charCodeAt(0)),
      isClean: /^[a-zA-Z0-9\-\.\:\/]+$/.test(rawUrl),
    },
    raw_fetch_supabase: "pending"
  };

  try {
    // We try fetching with a SANITIZED version of the URL
    const cleanUrl = rawUrl.trim().replace(/[^\x20-\x7E]/g, ""); 
    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim().replace(/[^\x20-\x7E]/g, ""),
      }
    });
    diagnostics.raw_fetch_supabase = `Success with sanitized URL! Status: ${res.status}`;
  } catch (e: any) {
    diagnostics.raw_fetch_supabase = `Failed even with sanitation: ${e.message}`;
  }

  return NextResponse.json(diagnostics);
}
