# Database

## Architecture
The database is **hosted Supabase PostgreSQL** with the `pgvector` extension for vector similarity search. There are **no versioned migrations in the repository** — the schema is managed manually via the Supabase SQL Editor. As a result, the table set below is inferred from code references and `README.md`/`implementation_plan.md`; column lists are **not authoritative**. Any structural change must be applied manually and coordinated with the team.

## Tables (by purpose)
| Table | Purpose |
|---|---|
| `documents` | Uploaded file metadata + processing `status` (`processing` / `indexed` / `error`). |
| `document_chunks` | Text chunks + `embedding` vector, linked to `documents`. The core retrieval unit. |
| `search_queries` | Raw user query log. Subject to 12-month `pg_cron` expungement (PIPA). |
| `search_cache` | Exact-match cached answers + `sources` (jsonb). 7-day app-enforced TTL. |
| `calendar_events` | School events synced from the DIS `.ics` feed. |
| `admin_access_requests` | Pending/approved/denied admin access workflow. |
| `feedback` | 👍/👎 ratings + 300-char preview of the AI response. |
| `analytics_cache` | Keyed jsonb cache (e.g. `top_questions` Groq clusters). |
| `document_sections` | Parent sections produced by the Stage 2 parser during ingestion. `documents` 1—many `document_sections` 1—many `document_chunks`. `summary` nullable (AI summaries deferred). |

## Relationships
- `document_chunks.document_id` → `documents` with `ON DELETE CASCADE` (verified at the DB level). The `delete-document` route additionally deletes chunks explicitly before the document row (belt-and-suspenders).
- `document_sections.document_id` → `documents` with `ON DELETE CASCADE`.
- `document_chunks.section_id` → `document_sections` with `ON DELETE CASCADE` (nullable; pre-Stage-3 chunks have `section_id = null`). Deleting a document cascades sections → cascades their chunks.
- `documents` 1—many `document_sections` 1—many `document_chunks` (Stage 3 normalized schema).

## pgvector & retrieval RPC
- Embeddings stored as `vector` columns (384-dim, implied by `all-MiniLM-L6-v2`).
- Retrieval is a Supabase RPC: `match_document_chunks(query_embedding, match_count, category_filter)`.
- Returns chunk content plus document metadata (`document_title`, `document_category`, `document_file_url`) and (when available) a `similarity` score. The app applies a 0.3 similarity floor client-side and is null-safe for older RPC versions that don't expose a score.
- The planned hybrid search would replace/augment this RPC with a BM25 + vector RRF function (see `rag.md`).

## Authentication & access
- **Supabase Auth**, email OTP flow. Verification handled in `api/auth/confirm` (`verifyOtp`).
- Two client modes in `lib/supabase/`:
  - `createClient()` — cookie-bound SSR client (anon key, user-scoped).
  - `createAdminClient()` — service-role client using `SUPABASE_SECRET_KEY` (privileged; API routes only).
- RBAC: email allowlist (`ADMIN_EMAILS`) **or** `app_metadata.role === 'admin'` (`lib/auth.ts`). Admin role is granted via `auth.admin.updateUserById` during the access-request approval flow.

## Storage
- Supabase Storage bucket `documents` holds uploaded PDFs/text files.
- Public URLs are stored on `documents.file_url` and passed to `process-doc` for download + parsing.
- Deletion attempts to remove the storage object best-effort (non-fatal on failure).

## Automation
- `pg_cron` daily job expunges `search_queries` older than 12 months to satisfy PIPA Art. 15. The job definition lives in Supabase, **not in the repository**.

## Schema management caveats
- No migration files → no reviewable history of schema evolution. *(Stage 3 onward: SQL is versioned under `supabase/migrations/` but still executed manually in the Supabase SQL Editor — see the file headers.)*
- Column-level details must be verified directly in the Supabase dashboard.
- Foreign keys use `ON DELETE CASCADE`; RLS policies mirror the `document_chunks` pattern ("Authenticated users can do all" + public read of indexed rows). Confirm directly in Supabase before relying on them.
