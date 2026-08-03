/**
 * Stage 2 Parser Validation Script
 *
 * Fetches all indexed documents from Supabase, downloads the PDFs,
 * runs extractDocumentStructure(), and reports heading extraction stats
 * against the 90% success criterion.
 *
 * Run with:
 *   node scripts/validate-parser.mjs
 */

import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

// ---------------------------------------------------------------------------
// Inline parser (mirrors app/api/process-doc/route.ts exactly)
// ---------------------------------------------------------------------------

function estimateTokens(text) {
  let tokens = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const isKorean =
      (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0x1100 && cp <= 0x11ff) ||
      (cp >= 0x3130 && cp <= 0x318f);
    tokens += isKorean ? 0.5 : 0.25;
  }
  return Math.ceil(tokens);
}

function isHeadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  // Reject PDF running-header artifacts
  if (/page\s*\d+$/i.test(trimmed)) return false;
  if (trimmed.includes('\u2014') && trimmed.length > 40) return false;
  // 1. Structural numeric headings (dotted, N), (N), 제N[counter])
  if (
    /^(\d+\.)+(\d+)?\s+\S/.test(trimmed) ||
    /^\d+\)\s+\S/.test(trimmed) ||
    /^\(\d+(?:\.\d+)*\)\s+\S/.test(trimmed) ||
    /^제\d+[장편부조항절관호목]\s+\S/.test(trimmed)
  ) return true;
  if (/^(chapter|section|part|appendix|article|unit|module)\s+[\dA-Z]/i.test(trimmed)) return true;
  if (/^(I{1,3}V?|VI{0,3}|IX|X{1,3}|[A-Z])\.\s+\S/.test(trimmed)) return true;
  if (/[.,;:]$/.test(trimmed)) return false;
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 10) return false;
  // Conservative table-row guard
  if (words.every(w => w.replace(/[^a-zA-Z]/g, '').length <= 3)) return false;
  const capitalised = words.filter(w => /^[A-Z]/.test(w)).length;
  return capitalised / words.length >= 0.6;
}

function headingDepth(trimmed) {
  const numericMatch = trimmed.match(/^(\d+(?:\.\d+)*)/);
  if (numericMatch) return numericMatch[1].split('.').filter(Boolean).length;
  const parenMatch = trimmed.match(/^\((\d+(?:\.\d+)*)\)/);
  if (parenMatch) return parenMatch[1].split('.').filter(Boolean).length + 1;
  if (/^제\d+[장편부조항절관호목]\s+/.test(trimmed)) return 1;
  const topKwMatch = trimmed.match(/^(chapter|part|appendix|article|unit)\s+(\d+(?:\.\d+)*)/i);
  if (topKwMatch) return 1 + (topKwMatch[2].split('.').filter(Boolean).length - 1);
  if (/^(chapter|part|appendix|article|unit)\s+/i.test(trimmed)) return 1;
  const subKwMatch = trimmed.match(/^(section|module)\s+(\d+(?:\.\d+)*)/i);
  if (subKwMatch) return 2 + (subKwMatch[2].split('.').filter(Boolean).length - 1);
  if (/^(section|module)\s+/i.test(trimmed)) return 2;
  if (/^(I{1,3}V?|VI{0,3}|IX|X{1,3}|[A-Z])\.\s+/.test(trimmed)) return 2;
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 3 && letters === letters.toUpperCase()) return 1;
  return 2;
}

const MAX_SECTION_TOKENS = 400;

function wordSplit(headingPath, text, startPart) {
  const words = text.split(/\s+/);
  const pieces = [];
  let chunk = [];
  let pi = startPart;
  for (const word of words) {
    chunk.push(word);
    if (estimateTokens(chunk.join(' ')) >= MAX_SECTION_TOKENS) {
      chunk.pop();
      if (chunk.length > 0) {
        pieces.push({ heading_path: `${headingPath} (Part ${pi})`, content: chunk.join(' ').trim() });
        pi++;
      }
      chunk = [word];
    }
  }
  if (chunk.length > 0) pieces.push({ heading_path: `${headingPath} (Part ${pi})`, content: chunk.join(' ').trim() });
  return pieces;
}

function splitOversizedSection(section) {
  if (estimateTokens(section.content) <= MAX_SECTION_TOKENS) return [section];
  const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim());
  const pieces = [];
  let current = '';
  let partIndex = 1;
  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    if (estimateTokens(candidate) > MAX_SECTION_TOKENS && current) {
      pieces.push({ heading_path: `${section.heading_path} (Part ${partIndex})`, content: current.trim() });
      current = para;
      partIndex++;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) {
    pieces.push({ heading_path: `${section.heading_path} (Part ${partIndex})`, content: current.trim() });
    partIndex++;
  }
  // Second pass: word-split any piece still over budget
  const finalPieces = [];
  for (const piece of pieces) {
    if (estimateTokens(piece.content) > MAX_SECTION_TOKENS) {
      finalPieces.push(...wordSplit(section.heading_path, piece.content, finalPieces.length + 1));
    } else {
      finalPieces.push(piece);
    }
  }
  return finalPieces.map((p, i) => ({
    ...p,
    heading_path: finalPieces.length > 1
      ? `${section.heading_path} (Part ${i + 1})`
      : p.heading_path,
  }));
}

function extractDocumentStructure(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const sections = [];
  const headingStack = [];
  let currentContent = [];

  const flushSection = () => {
    const content = currentContent.join('\n').trim();
    if (!content) return;
    const heading_path = headingStack.length > 0 ? headingStack.join(' \u2192 ') : 'Introduction';
    sections.push({ heading_path, content });
    currentContent = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (isHeadingLine(line)) {
      flushSection();
      const trimmed = line.trim();
      const depth = headingDepth(trimmed);
      while (headingStack.length >= depth) headingStack.pop();
      headingStack.push(trimmed);
    } else {
      currentContent.push(line);
    }
  }
  flushSection();

  const bounded = [];
  for (const section of sections) {
    for (const piece of splitOversizedSection(section)) bounded.push(piece);
  }
  return bounded.filter(s => s.content.trim().length > 0);
}

// ---------------------------------------------------------------------------
// Validation runner
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars.');
  console.error('Run with: node --env-file=.env.local scripts/validate-parser.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('='.repeat(60));
  console.log('Stage 2 Parser Validation');
  console.log('='.repeat(60));

  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title, file_url, category')
    .eq('status', 'indexed')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch documents:', error.message);
    process.exit(1);
  }

  if (!docs || docs.length === 0) {
    console.warn('No indexed documents found in Supabase.');
    process.exit(0);
  }

  console.log(`Found ${docs.length} indexed document(s). Testing up to 10.\n`);

  const sample = docs.slice(0, 10);
  const docResults = [];

  for (const doc of sample) {
    process.stdout.write(`Processing: "${doc.title}" ... `);

    try {
      const res = await fetch(doc.file_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const isPdf = contentType.includes('application/pdf') || doc.file_url.toLowerCase().includes('.pdf');

      let text = '';
      if (isPdf) {
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } else {
        text = buffer.toString('utf-8');
      }

      if (!text || text.trim().length === 0) {
        console.log('SKIP (no text extracted)');
        continue;
      }

      const sections = extractDocumentStructure(text);
      const totalSections = sections.length;
      const uniquePaths = new Set(sections.map(s => s.heading_path)).size;
      const introOnly = sections.every(s => s.heading_path === 'Introduction' || s.heading_path.startsWith('Introduction (Part'));
      const splitSections = sections.filter(s => s.heading_path.includes('(Part')).length;
      const oversized = sections.filter(s => estimateTokens(s.content) > MAX_SECTION_TOKENS).length;
      const maxTokens = Math.max(...sections.map(s => estimateTokens(s.content)));
      const avgTokens = Math.round(sections.reduce((a, s) => a + estimateTokens(s.content), 0) / totalSections);
      const hasKorean = /[\uAC00-\uD7A3]/.test(text);

      console.log('OK');

      docResults.push({
        title: doc.title,
        category: doc.category,
        hasKorean,
        totalSections,
        uniquePaths,
        splitSections,
        oversized,
        maxTokens,
        avgTokens,
        introOnly,
        headingQuality: introOnly ? 'FAIL' : 'PASS',
        samplePaths: [...new Set(sections.map(s => s.heading_path))].slice(0, 8),
      });

      console.log(`  Sections: ${totalSections} | Unique paths: ${uniquePaths} | Splits: ${splitSections} | Max tokens: ${maxTokens} | Avg: ${avgTokens}${hasKorean ? ' | Korean detected' : ''}`);
      console.log('  Sample heading_paths:');
      for (const p of docResults[docResults.length - 1].samplePaths) {
        console.log(`    - ${p}`);
      }
      console.log();

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // Summary
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));

  const tested = docResults.length;
  const passed = docResults.filter(r => r.headingQuality === 'PASS').length;
  const successRate = tested > 0 ? Math.round((passed / tested) * 100) : 0;

  for (const r of docResults) {
    const icon = r.headingQuality === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`[${icon}] [${r.category}] ${r.title}`);
    console.log(`       Sections: ${r.totalSections} | Paths: ${r.uniquePaths} | Splits: ${r.splitSections} | Max tokens: ${r.maxTokens}${r.hasKorean ? ' | Korean' : ''}`);
  }

  console.log();
  console.log(`Success rate: ${successRate}% (${passed}/${tested} documents have detected headings)`);

  if (successRate >= 90) {
    console.log('SUCCESS CRITERION MET (>=90%) - Stage 2 parser approved.');
  } else {
    console.log('SUCCESS CRITERION NOT MET (<90%) - parser needs tuning before Stage 3.');
  }

  const anyOversized = docResults.some(r => r.oversized > 0);
  console.log(anyOversized
    ? '\nWARNING: Some sections still exceed 400 tokens after splitting.'
    : '\nAll sections within 400-token budget.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
