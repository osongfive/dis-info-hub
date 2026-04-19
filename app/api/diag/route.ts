import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

export async function GET() {
  const diagnostics = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      HF_ACCESS_TOKEN: !!process.env.HF_ACCESS_TOKEN,
    },
    database: "checking...",
    groq: "checking...",
  };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { count, error } = await supabase.from('documents').select('*', { count: 'exact', head: true });
    if (error) throw error;
    diagnostics.database = `Connected! Total documents indexed: ${count}`;
  } catch (e: any) {
    diagnostics.database = `Error: ${e.message}`;
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'missing' });
    const models = await groq.models.list();
    diagnostics.groq = `Connected! Found ${models.data.length} models.`;
  } catch (e: any) {
    diagnostics.groq = `Error: ${e.message}`;
  }

  return NextResponse.json(diagnostics);
}
