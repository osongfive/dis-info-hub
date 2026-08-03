# RAG Pipeline

## Overview
Retrieval-Augmented Generation grounds every answer in official DIS documents. The pipeline is split into **ingestion** (admin uploads → embeddings) and **query** (user question → retrieved context → LLM). Both share the same embedding model.

## Embeddings
- Model: `sentence-transformers/all-MiniLM-L6-v2` via the Hugging Face Inference API.
- Used at both ingestion (chunk embedding) and query time.
- Query-time embedding runs on the **translated English** query when the original is Korean.

## Ingestion pipeline (`api/process-doc`)
Admin-only. Steps:
1. `requireAdmin()` RBAC check.
2. SSRF validation of the document URL (`isUrlSafe`).
3. Download file; detect PDF by content-type or `.pdf` extension.
4. Extract text with `pdf-parse` (PDF) or `utf-8` decode (text).
5. **Chunk** (see below).
6. Batched HF embeddings → insert into `document_chunks`.
7. Update `documents.status` to `indexed` (or `error` on failure).

## Chunking — two strategies (important)
There are **two chunking implementations**, only one of which is active:

### Active chunker (used in the POST handler)
Sentence-aware splitting: paragraphs → sentences, target ~800 chars per chunk, ~120-char overlap carried from the prior chunk, with a hard-split fallback for oversized sentences. Batched embedding (batch size 10).

### Implemented but NOT wired in (`extractDocumentStructure`)
A more advanced structure-aware parser exists in the same file (and is mirrored in `scripts/validate-parser.mjs`) but the POST handler does **not** call it. It is the foundation of the planned parent-child retrieval migration (see "Planned improvements" below).

> ⚠️ Flag: `implementation_plan.md` describes this parser as the future ingestion path, but it is dead code today. See `technical-debt.md`.

#### Parser contract (Stage 2 final)

**1. Supported heading patterns** — detected in priority order by `isHeadingLine()` (line must be ≤ 80 chars; PDF running-header artifacts like `... Page 3` and long em-dash title lines are rejected first):
- **Numeric / structural numbering** (language-independent): `1.` / `1.2` / `1.2.3 Title`, `2) Title`, `(1)` / `(1.2) Title`, Korean ordinal+counter `제1장 Title` (counters: 장 편 부 조 항 절 관 호 목).
- **English keyword headings**: `Chapter`, `Section`, `Part`, `Appendix`, `Article`, `Unit`, `Module` followed by a digit or uppercase letter.
- **Lettered outlines**: `A.`, `B.`, `I.`, `II.`, `III.` (alpha or Roman).
- **ALL-CAPS lines**: ≥ 3 letters, fully uppercase, no trailing `.,;:`.
- **Title-Case lines**: 2–10 words, ≥ 60% capitalised, no trailing `.,;:`. A conservative table-row guard rejects lines where every word has ≤ 3 alpha chars (e.g. `9 10 11 12`, `Yes No N/A`); legitimate headings like `Academic Integrity Policy` always contain a longer word and are preserved.

**2. Heading depth rules** — `headingDepth()` assigns a numeric depth; a breadcrumb stack pops to the parent level, producing `heading_path` strings like `Student Handbook → Attendance → Excused Absences`.
- Dotted numeric: component count — `1.`→1, `1.2`→2, `1.2.3`→3. `N)` → 1.
- Parenthesised `(N)` / `(N.M)`: component count + 1 (sub-level) — `(1)`→2, `(1.2)`→3.
- Korean `제N[counter]` → 1 (chapter-level divider).
- Keyword + numeric hierarchy: baseline + (numeric components − 1). Top-level keywords (`Chapter/Part/Appendix/Article/Unit`) baseline 1 — `Chapter 5`→1, `Chapter 5.2`→2. Second-level keywords (`Section/Module`) baseline 2 — `Section 3`→2, `Section 3.2`→3, `Section 3.2.1`→4, `Module 1.4.2`→4.
- Lettered outline (A., I.) → 2. ALL-CAPS → 1. Title-Case → 2.
- Example output: `제1장 학교 소개 → 1. 출석 정책 → (1) 출석 정책 → Excused Absences`.

**3. Token splitting behavior**:
- **Target**: `MAX_SECTION_TOKENS = 400` (hard ceiling below the 512-token MiniLM limit).
- **Estimation**: Korean-aware — ~2 chars/token for Hangul, ~4 chars/token for ASCII.
- **Part splitting**: when a section exceeds 400 tokens, it is split first at paragraph boundaries (`\n\s*\n`); each piece is labeled `(Part n)` on the `heading_path`. If a single paragraph still exceeds the budget, a word-boundary fallback split runs and pieces are re-labeled contiguously.
- Single-piece sections keep their original `heading_path` (no `(Part n)` suffix).

**4. Known limitations**:
- **PDF table extraction**: not performed. The table-row guard only prevents obvious short-cell rows (`9 10 11 12`, `Yes No N/A`) from becoming headings; table contents are otherwise ingested as body text.
- **Ambiguous ALL-CAPS headings**: any short uppercase line ≥ 3 letters is treated as a heading, so running headers, slogans, or labels (e.g. `We are DIS`) can be misclassified if they are not caught by the earlier guards.
- **Long paragraph splitting**: word-boundary fallback splits mid-sentence when a single paragraph exceeds 400 tokens, which can fragment semantic context. Split pieces are individually addressable via `(Part n)` but no overlap is carried between them.

## Retrieval (query time)
- Pure **vector cosine similarity** via the Supabase RPC `match_document_chunks`.
- Top-15 chunks, similarity floor 0.3, optional category filter.
- **No rerank / no hybrid search / no parent-child dedup** — single-stage retrieval only.

## Context augmentation
- Retrieved chunk contents joined with `\n\n`.
- **Calendar augmentation**: if the query contains date/event keywords, upcoming `calendar_events` are appended as extra context and a synthetic "Live School Calendar" source is added.
- Sources are deduplicated by document title (chunk metadata: `document_title`, `document_category`, `document_file_url`).

## Prompting
- System prompt is **defined server-side** (never client-controlled). It forces: answer only from provided documents, reply in the same language as the question (EN or KO, never mix), no meta-discussion, be detailed (exact colors/rooms/times), use markdown.
- User message wraps the context and question: `Document Context:\n...\n\nStudent Question:\n...`.
- `temperature: 0.1`.

## Caching
Exact-match `search_cache` lookup (≤7 days old) short-circuits the entire pipeline and returns a single non-streamed payload. After a streamed response completes, the answer is inserted into the cache asynchronously. There is **no invalidation** when documents change (see `technical-debt.md`).

## Model routing
See `architecture.md` → "Model routing — Triple-Guard". The same Groq client also handles Korean→English translation (`gpt-oss-20b`) before retrieval.

## Current limitations
- Single-stage vector retrieval only; no lexical (BM25) component.
- No reranker or parent-section deduplication.
- Chunking ignores document structure (active chunker is purely sentence-based).
- No cache invalidation on document re-upload/delete.

## Planned improvements (`implementation_plan.md`)
A documented but **unimplemented** migration to structure-aware, parent-child retrieval:
- New normalized schema: `documents → document_sections → document_chunks`.
- `document_sections` with AI-generated summaries + explicit section embeddings.
- Add `fts` tsvector column for full-text search.
- **Hybrid search** via Reciprocal Rank Fusion (RRF) of BM25 + vector similarity on `document_chunks`.
- Retrieve top-K child chunks → group by section → score each section by **max child score** → select top-5 unique parent sections → pass to `gpt-oss-120b`.
- Evaluation: a 20–30 question benchmark measuring Recall@5, citation accuracy, and answer correctness.

> ⚠️ Flag: `implementation_plan.md` notes there are **no local Supabase migration files**; schema changes must be applied manually in the Supabase SQL Editor. The plan also requires re-processing the existing corpus.
