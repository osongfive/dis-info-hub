import { NextResponse, NextRequest } from 'next/server';
import { rateLimit } from '@/lib/rate-limit'
import { createAdminClient } from '@/lib/supabase/server';
import { HfInference } from '@huggingface/inference';
import { isUrlSafe } from '@/lib/security';
import { requireAdmin } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Parser — Stage 2
// ---------------------------------------------------------------------------

export interface DocumentSection {
  heading_path: string;
  content: string;
}

/**
 * Estimates token count for mixed English/Korean text.
 *
 * Rationale for Korean adjustment:
 *   - all-MiniLM-L6-v2 uses a WordPiece tokenizer trained primarily on
 *     English.  Korean Hangul syllable blocks (가–힣) are not in its
 *     vocabulary so each character is typically tokenized as one or more
 *     [UNK]/byte-pair tokens — commonly 1–2 tokens per syllable.
 *   - The ASCII approximation (4 chars ≈ 1 token) severely under-counts
 *     Korean text: a 400-character Korean paragraph may consume ~400–800
 *     tokens, not 100.
 *   - Using 2 chars ≈ 1 token for Korean characters provides a
 *     conservative upper-bound that keeps mixed documents safely under the
 *     512-token hard limit of all-MiniLM-L6-v2.
 *   - For pure English, 4 chars ≈ 1 token remains a well-established rule
 *     of thumb and is unchanged.
 */
function estimateTokens(text: string): number {
  let tokens = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    // Hangul syllables U+AC00–U+D7A3, jamo U+1100–U+11FF, compat U+3130–U+318F
    const isKorean =
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0x1100 && cp <= 0x11ff) ||
      (cp >= 0x3130 && cp <= 0x318f);
    tokens += isKorean ? 0.5 : 0.25; // 2 chars/token for KO, 4 chars/token for EN
  }
  return Math.ceil(tokens);
}

// ---------------------------------------------------------------------------
// Heading detection
// ---------------------------------------------------------------------------

/**
 * Returns true when a line looks like a document heading.
 *
 * Heuristics applied (in priority order):
 *  1. Numbered headings  — "1.", "1.2", "1.2.3 Title"
 *  2. Keyword headings   — "Chapter N", "Section N", "Part N", "Appendix N/X"
 *  3. Lettered headings  — "A.", "B.", "I.", "II." (outline / appendix style)
 *  4. ALL-CAPS lines     — short (≤ 80 chars), no trailing body punctuation
 *  5. Title-Case lines   — 2–10 words, ≥ 60% capitalised, no trailing period
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;

  // Reject PDF running-header artifacts:
  //  - Lines ending with a page number pattern ("Page 3", "DocumentPage 1")
  //  - Long lines containing an em-dash are document-title headers, not section headings
  if (/page\s*\d+$/i.test(trimmed)) return false;
  if (trimmed.includes('\u2014') && trimmed.length > 40) return false; // em-dash in long line

  // 1. Structural numeric headings (language-independent numbering).
  //    Existing dotted regex only matched "."-delimited forms. It missed
  //    "N)", "(N)", "(N.M)" and Korean ordinal "제N장" because those use a
  //    different delimiter, not a keyword. Detection here is structural
  //    (number + delimiter + counter) — no translated keyword lookup.
  if (
    /^(\d+\.)+(\d+)?\s+\S/.test(trimmed) ||            // 1. / 1.2 / 1.2.3 Title
    /^\d+\)\s+\S/.test(trimmed) ||                      // 2) Title
    /^\(\d+(?:\.\d+)*\)\s+\S/.test(trimmed) ||          // (1) / (1.2) Title
    /^제\d+[장편부조항절관호목]\s+\S/.test(trimmed)        // 제1장 Title (Korean ordinal + counter)
  ) return true;

  // 2. Keyword-led:  "Chapter 3", "Section 2", "Part IV", "Appendix A"
  if (/^(chapter|section|part|appendix|article|unit|module)\s+[\dA-Z]/i.test(trimmed)) return true;

  // 3. Lettered outline: "A.", "B.", "I.", "II.", "III." (Roman or alpha)
  if (/^(I{1,3}V?|VI{0,3}|IX|X{1,3}|[A-Z])\.\s+\S/.test(trimmed)) return true;

  // Lines ending with body-text punctuation are not headings
  if (/[.,;:]$/.test(trimmed)) return false;

  // 4. ALL-CAPS line
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;

  // 5. Title-Case: 2–10 words, majority capitalised
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 10) return false;

  // Conservative table-row guard: reject obvious table data/header rows
  // where every word is short (≤ 3 alpha chars). Catches sequences like
  // "9 10 11 12" or "Yes No N/A" without rejecting real headings such as
  // "Academic Integrity Policy" (which always contain a longer word).
  if (words.every(w => w.replace(/[^a-zA-Z]/g, '').length <= 3)) return false;

  const capitalised = words.filter(w => /^[A-Z]/.test(w)).length;
  return capitalised / words.length >= 0.6;
}

// ---------------------------------------------------------------------------
// Depth assignment — keyword-based, NOT length-based
// ---------------------------------------------------------------------------

/**
 * Assigns a numeric hierarchy depth to a detected heading.
 *
 * Strategy (in priority order):
 *  1. Numeric outline depth:    "1." → 1,  "1.2" → 2,  "1.2.3" → 3
 *  2. Top-level keywords:       Chapter / Part / Appendix / Article / Unit → 1
 *  3. Second-level keywords:    Section / Module → 2
 *  4. Lettered outline (A., I.) → 2  (typically sub-appendix or sub-chapter)
 *  5. ALL-CAPS lines            → 1  (document-level dividers)
 *  6. Title-Case lines          → 2  (sub-section titles)
 *
 * This replaces the previous approach of inferring depth from line length,
 * which was unreliable for short sub-headings and long chapter titles.
 */
function headingDepth(trimmed: string): number {
  // 1. Numeric outline
  const numericMatch = trimmed.match(/^(\d+(?:\.\d+)*)/);
  if (numericMatch) {
    return numericMatch[1].split('.').filter(Boolean).length;
  }

  // 1b. Parenthesised numbering "(1)" / "(1.2)" — sub-level under a top
  //     "1." item: depth = component count + 1.
  const parenMatch = trimmed.match(/^\((\d+(?:\.\d+)*)\)/);
  if (parenMatch) {
    return parenMatch[1].split('.').filter(Boolean).length + 1;
  }

  // 1c. Korean ordinal + counter "제1장" — chapter-level structural divider.
  if (/^제\d+[장편부조항절관호목]\s+/.test(trimmed)) return 1;

  // 2. Top-level structural keywords.
  //    Honor a trailing numeric hierarchy: "Chapter 5" → 1, "Chapter 5.2" → 2.
  const topKwMatch = trimmed.match(/^(chapter|part|appendix|article|unit)\s+(\d+(?:\.\d+)*)/i);
  if (topKwMatch) {
    const components = topKwMatch[2].split('.').filter(Boolean).length;
    return 1 + (components - 1);
  }
  if (/^(chapter|part|appendix|article|unit)\s+/i.test(trimmed)) return 1;

  // 3. Second-level structural keywords.
  //    Honor a trailing numeric hierarchy: "Section 3" → 2, "Section 3.2" → 3,
  //    "Section 3.2.1" → 4, "Module 1.4.2" → 4.
  const subKwMatch = trimmed.match(/^(section|module)\s+(\d+(?:\.\d+)*)/i);
  if (subKwMatch) {
    const components = subKwMatch[2].split('.').filter(Boolean).length;
    return 2 + (components - 1);
  }
  if (/^(section|module)\s+/i.test(trimmed)) return 2;

  // 4. Lettered outline (A., B., I., II.)
  if (/^(I{1,3}V?|VI{0,3}|IX|X{1,3}|[A-Z])\.\s+/.test(trimmed)) return 2;

  // 5. ALL-CAPS → top-level divider
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return 1;

  // 6. Title-Case → sub-section
  return 2;
}

// ---------------------------------------------------------------------------
// Token-budget enforcement
// ---------------------------------------------------------------------------

const MAX_SECTION_TOKENS = 400;

/**
 * Splits an oversized section at paragraph boundaries so that each piece
 * stays within MAX_SECTION_TOKENS.  Split pieces are differentiated by
 * appending "(Part n)" to the heading_path so that every stored row is
 * individually addressable in the database.
 */
/**
 * Splits text at word boundaries into chunks each ≤ MAX_SECTION_TOKENS.
 * Used as the final guarantee when paragraph-level splitting still leaves
 * an oversized piece.
 */
function wordSplit(headingPath: string, text: string, startPart: number): DocumentSection[] {
  const words = text.split(/\s+/);
  const pieces: DocumentSection[] = [];
  let chunk: string[] = [];
  let pi = startPart;
  for (const word of words) {
    chunk.push(word);
    if (estimateTokens(chunk.join(' ')) >= MAX_SECTION_TOKENS) {
      // Back off one word so the chunk doesn't exceed the limit
      chunk.pop();
      if (chunk.length > 0) {
        pieces.push({
          heading_path: `${headingPath} (Part ${pi})`,
          content: chunk.join(' ').trim(),
        });
        pi++;
      }
      chunk = [word];
    }
  }
  if (chunk.length > 0) {
    pieces.push({
      heading_path: `${headingPath} (Part ${pi})`,
      content: chunk.join(' ').trim(),
    });
  }
  return pieces;
}

function splitOversizedSection(section: DocumentSection): DocumentSection[] {
  if (estimateTokens(section.content) <= MAX_SECTION_TOKENS) {
    return [section];
  }

  const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim());
  const pieces: DocumentSection[] = [];
  let current = '';
  let partIndex = 1;

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    if (estimateTokens(candidate) > MAX_SECTION_TOKENS && current) {
      pieces.push({
        heading_path: `${section.heading_path} (Part ${partIndex})`,
        content: current.trim(),
      });
      current = para;
      partIndex++;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    pieces.push({
      heading_path: `${section.heading_path} (Part ${partIndex})`,
      content: current.trim(),
    });
    partIndex++;
  }

  // Second pass: any piece still over budget gets word-boundary split.
  // This covers single oversized paragraphs that couldn't be separated above.
  const finalPieces: DocumentSection[] = [];
  for (const piece of pieces) {
    if (estimateTokens(piece.content) > MAX_SECTION_TOKENS) {
      const sub = wordSplit(section.heading_path, piece.content, finalPieces.length + 1);
      finalPieces.push(...sub);
    } else {
      finalPieces.push(piece);
    }
  }

  // Re-label sequentially so Part numbers are contiguous
  return finalPieces.map((p, i) => ({
    ...p,
    heading_path: finalPieces.length > 1
      ? `${section.heading_path} (Part ${i + 1})`
      : p.heading_path,
  }));
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Extracts a structured list of sections from flat PDF text.
 *
 * Algorithm:
 *  1. Split text into lines.
 *  2. Walk line by line; when a heading is detected via isHeadingLine(),
 *     flush the current content buffer and start a new section.
 *  3. Track a breadcrumb stack using keyword-based depth (headingDepth())
 *     to produce nested heading_paths like:
 *       "Student Handbook → Attendance → Excused Absences"
 *  4. Flush the final buffer after the last line.
 *  5. Enforce the 400-token budget; split oversized sections and label
 *     each piece with "(Part n)".
 *
 * Pluggable: the body of this function can be replaced with an LLM-assisted
 * parser without changing the ingestion pipeline (Stage 4+).
 */
export function extractDocumentStructure(text: string): DocumentSection[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  const sections: DocumentSection[] = [];
  const headingStack: string[] = []; // breadcrumb entries, one per depth level
  let currentContent: string[] = [];

  const flushSection = () => {
    const content = currentContent.join('\n').trim();
    if (!content) return;
    const heading_path =
      headingStack.length > 0 ? headingStack.join(' → ') : 'Introduction';
    sections.push({ heading_path, content });
    currentContent = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (isHeadingLine(line)) {
      flushSection();

      const trimmed = line.trim();
      const depth = headingDepth(trimmed);

      // Pop the stack down to the parent level of this heading
      while (headingStack.length >= depth) {
        headingStack.pop();
      }
      headingStack.push(trimmed);
    } else {
      currentContent.push(line);
    }
  }

  flushSection();

  // Enforce token budget
  const bounded: DocumentSection[] = [];
  for (const section of sections) {
    for (const piece of splitOversizedSection(section)) {
      bounded.push(piece);
    }
  }

  return bounded.filter(s => s.content.trim().length > 0);
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Apply rate limiting: 3 requests per hour for document processing
  const { success, reset } = rateLimit(req, { limit: 3, windowMs: 3600 * 1000 });
  if (!success) {
    return NextResponse.json(
      { error: 'Too many document processing requests. Please try again later.' },
      { 
        status: 429,
        headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
      }
    );
  }

  let documentId: string | undefined;

  try {
    // 1. Verify Authentication & RBAC using centralized utility
    await requireAdmin();

    const pdfParse = require('pdf-parse');
    const body = await req.json();
    documentId = body.documentId;
    const fileUrl = body.fileUrl;

    if (!documentId || !fileUrl) {
      return NextResponse.json({ error: 'Missing documentId or fileUrl' }, { status: 400 });
    }

    // 2. SSRF Protection: Validate the fileUrl using shared utility
    if (!isUrlSafe(fileUrl)) {
      return NextResponse.json({ error: 'Invalid or unsafe fileUrl provided' }, { status: 400 });
    }

    // 3. Initialize Admin Client for privileged operations
    const supabase = createAdminClient();

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
        const supabase = createAdminClient();
        await supabase.from('documents').update({ status: 'error' }).eq('id', documentId);
      } catch (_) { }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
