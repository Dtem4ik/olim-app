-- Olim App — vector embeddings for hybrid AI retrieval (Phase 8a).
--
-- Scope: ADDITIVE, `public`-only. Adds a pgvector embedding column + HNSW index
-- to public.steps and a public.match_steps() similarity RPC. Nothing references,
-- alters, or grants on the `portfolio` schema. See AGENTS.md rules 6 & 7.
--
-- Objects created:
--   extension: vector (into the `extensions` schema, Supabase convention)
--   column:    public.steps.embedding  extensions.vector(768)
--   index:     public.steps_embedding_hnsw_idx  (HNSW, cosine)
--   function:  public.match_steps(extensions.vector, integer, real)
--
-- Model / dimensions
-- ------------------
-- Embeddings are produced by Google's `gemini-embedding-001` truncated to 768
-- dimensions (Matryoshka; `outputDimensionality: 768`). 768 keeps us comfortably
-- under pgvector's 2000-dim HNSW ceiling and is a good quality/size trade-off for
-- ~46 short RU steps. The index uses COSINE distance (`vector_cosine_ops`): cosine
-- is scale-invariant, so a truncated (un-renormalized) Gemini vector needs no
-- extra normalization. Embeddings are computed at content-import time (see
-- scripts/content-import.ts) — never per query except for the user's own query.

create extension if not exists vector with schema extensions;

alter table public.steps
  add column if not exists embedding extensions.vector(768);

-- HNSW builds fine while the column is still partly/fully NULL — unembedded rows
-- are simply not indexed (and excluded by match_steps' `embedding is not null`).
create index if not exists steps_embedding_hnsw_idx
  on public.steps using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- match_steps(query_embedding, limit, min_similarity) — vector similarity search.
-- ---------------------------------------------------------------------------
-- Returns matched steps (with their section's title + icon for the result tile)
-- ordered by cosine similarity, highest first. `similarity` is 1 - cosine_distance
-- in [−1, 1] (≈1 = near-identical). SECURITY INVOKER: steps are world-readable
-- under RLS, so no elevated privilege is needed. The FTS path lives in
-- public.search_steps (Phase 6a); hybrid fusion happens in the app (lib/rag).
create or replace function public.match_steps(
  p_query_embedding extensions.vector,
  p_limit integer default 20,
  p_min_similarity real default 0.0
)
returns table (
  slug          text,
  section_slug  text,
  title         text,
  summary       text,
  section_title text,
  section_icon  text,
  similarity    real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    s.slug,
    s.section_slug,
    s.title,
    s.summary,
    sec.title as section_title,
    sec.icon  as section_icon,
    (1 - (s.embedding <=> p_query_embedding))::real as similarity
  from public.steps s
  join public.sections sec on sec.slug = s.section_slug
  where s.embedding is not null
    and (1 - (s.embedding <=> p_query_embedding)) >= p_min_similarity
  order by s.embedding <=> p_query_embedding
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.match_steps(extensions.vector, integer, real) to anon, authenticated;
