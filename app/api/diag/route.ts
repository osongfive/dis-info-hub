import { NextResponse } from 'next/server';

export async function GET() {
  const diagnostics: any = {
    env_checks: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    raw_fetch_google: "pending",
    raw_fetch_supabase: "pending",
    url_details: {
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      startsWithHttps: process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://'),
      hasWhitespace: /\s/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
    }
  };

  // Test 1: General Internet
  try {
    const res = await fetch('https://www.google.com', { method: 'HEAD' });
    diagnostics.raw_fetch_google = `Success! Status: ${res.status}`;
  } catch (e: any) {
    diagnostics.raw_fetch_google = `Failed: ${e.message}`;
  }

  // Test 2: Raw Supabase Connection
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error("URL missing");
    
    // We try to fetch the REST health check
    const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      }
    });
    diagnostics.raw_fetch_supabase = `Success! Status: ${res.status}`;
  } catch (e: any) {
    diagnostics.raw_fetch_supabase = `Failed: ${e.message}`;
    diagnostics.raw_fetch_supabase_stack = e.stack;
  }

  return NextResponse.json(diagnostics);
}
