import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';

import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let documentId: string | undefined;

  try {
    // 1. Verify Authentication
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const pdfParse = require('pdf-parse');
    const body = await req.json();
    documentId = body.documentId;
    const fileUrl = body.fileUrl;

    if (!documentId || !fileUrl) {
      return NextResponse.json({ error: 'Missing documentId or fileUrl' }, { status: 400 });
    }

    // 2. Initialize Service Client for privileged operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY!;
    const supabase = createClient(supabaseUrl, supabaseSecret);

    const hfToken = process.env.HF_ACCESS_TOKEN;
    if (!hfToken) {
      await supabase.from('documents').update({ status: 'error' }).eq('id', documentId);
      return NextResponse.json({ error: 'Missing HF_ACCESS_TOKEN' }, { status: 500 });
    }
    const hf = new HfInference(hfToken);

    // 1. Download file
    const response = await fetch(fileUrl);
    const contentType = response.headers.get('content-type') || '';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';
    // Detect PDF by content-type OR URL extension
    const isPdf = contentType.includes('application/pdf') || fileUrl.toLowerCase().includes('.pdf');

    if (isPdf) {
      const data = await pdfParse(buffer);
      text = data.text;
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text || text.trim().length === 0) {
      await supabase.from('documents').update({ status: 'error' }).eq('id', documentId);
      return NextResponse.json({ error: 'No text extracted from file' }, { status: 400 });
    }

    // 2. Smarter chunking: sentence-aware with slight overlap
    const maxLen = 800;
    const overlapChars = 120;
    const chunks: string[] = [];

    // Normalize whitespace a bit
    const normalized = text.replace(/\r\n/g, "\n").replace(/\t/g, " ");

    // Split into paragraphs first (blank lines), then into sentences
    const paragraphs = normalized
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const sentenceSplitter = /(?<=[\.!?])\s+(?=[A-Z0-9])/;

    for (const para of paragraphs) {
      const sentences = para.split(sentenceSplitter).map((s) => s.trim()).filter((s) => s.length > 0);
      let current = "";

      for (const sentence of sentences) {
        if ((current + " " + sentence).trim().length <= maxLen) {
          current = (current ? current + " " : "") + sentence;
        } else {
          if (current) {
            chunks.push(current);
          }
          // Start new chunk, optionally with some overlap from previous chunk
          const overlap =
            current.length > overlapChars
              ? current.slice(current.length - overlapChars)
              : current;
          current = (overlap ? overlap + " " : "") + sentence;
          if (current.length > maxLen) {
            // If still too long (very long sentence), hard-split
            for (let i = 0; i < current.length; i += maxLen) {
              chunks.push(current.slice(i, i + maxLen));
            }
            current = "";
          }
        }
      }

      if (current) {
        chunks.push(current);
      }
    }

    // Fallback: if somehow no chunks, use the whole text cut into maxLen pieces
    if (chunks.length === 0) {
      for (let i = 0; i < normalized.length; i += maxLen) {
        const slice = normalized.slice(i, i + maxLen).trim();
        if (slice.length > 0) {
          chunks.push(slice);
        }
      }
    }

    console.log(`[process-doc] Processing ${chunks.length} chunks for document ${documentId}`);

    // 3. Generate Embeddings (larger batches for performance)
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const embeddings = await Promise.all(
        batch.map(chunkText => hf.featureExtraction({
          model: 'sentence-transformers/all-MiniLM-L6-v2',
          inputs: chunkText,
        }))
      );

      const chunkRecords = batch.map((chunkText, idx) => ({
        document_id: documentId,
        content: chunkText,
        // @ts-ignore
        embedding: embeddings[idx],
      }));

      const { error: insertError } = await supabase.from('document_chunks').insert(chunkRecords);
      if (insertError) throw insertError;

      console.log(`[process-doc] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    }

    // 4. Update parent document status
    await supabase.from('documents').update({ status: 'indexed' }).eq('id', documentId);
    console.log(`[process-doc] Document ${documentId} indexed successfully`);

    return NextResponse.json({ success: true, processedChunks: chunks.length });
  } catch (error: any) {
    console.error('[process-doc] Error:', error);
    // Always try to mark the document as errored
    if (documentId) {
      try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
        await supabase.from('documents').update({ status: 'error' }).eq('id', documentId);
      } catch (_) { }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
