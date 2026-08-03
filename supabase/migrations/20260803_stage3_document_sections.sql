-- ============================================================================
-- Stage 3: Normalized document_sections schema + section/chunk relationships
-- ============================================================================
-- Execute MANUALLY in the Supabase SQL Editor.
-- Idempotent (IF NOT EXISTS guards) — safe to re-run.
--
-- Scope:
--   * Create document_sections (documents -> sections -> chunks).
--   * Link document_chunks to their parent section via section_id.
--   * Enable RLS mirroring the document_chunks policies.
--
-- Deliberately OUT of scope (deferred to later stages):
--   * document_sections.embedding        — unused by current retrieval
--                                          (Stage 4 scores sections by max
--                                           child chunk score, not section
--                                           embeddings). Add via ALTER later.
--   * documents.version / is_active      — nothing reads them yet.
--   * document_chunks.fts / embedding_model — Hybrid Search stage.
-- ============================================================================

-- 1. document_sections table ------------------------------------------------
create table if not exists public.document_sections (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  heading_path text not null,
  content      text not null,
  summary      text,                           -- nullable; AI summary deferred
  created_at   timestamptz not null default timezone('utc', now())
);

create index if not exists document_sections_document_id_idx
  on public.document_sections(document_id);

-- 2. Link chunks to their parent section ------------------------------------
alter table public.document_chunks
  add column if not exists section_id uuid
  references public.document_sections(id) on delete cascade;

create index if not exists document_chunks_section_id_idx
  on public.document_chunks(section_id);

-- 3. Row Level Security (mirror document_chunks policies) -------------------
alter table public.document_sections enable row level security;

drop policy if exists "Authenticated users can do all" on public.document_sections;
create policy "Authenticated users can do all"
  on public.document_sections for all
  using (auth.role() = 'authenticated');

drop policy if exists "Public can read sections for indexed documents" on public.document_sections;
create policy "Public can read sections for indexed documents"
  on public.document_sections for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_sections.document_id
        and d.status = 'indexed'
    )
  );
