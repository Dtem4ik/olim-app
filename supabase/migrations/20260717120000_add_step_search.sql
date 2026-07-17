-- Olim App — full-text search over steps (Phase 6a).
--
-- Scope: ADDITIVE, `public`-only. Adds a generated tsvector column + GIN index
-- and pg_trgm indexes to public.steps, plus a public.search_steps() RPC. Nothing
-- references, alters, or grants on the `portfolio` schema. See AGENTS.md rules 6 & 7.
--
-- Objects created (all in public):
--   extension: pg_trgm (into the `extensions` schema, Supabase convention)
--   column:    public.steps.search_vector (GENERATED ALWAYS ... STORED)
--   indexes:   GIN(search_vector); GIN trgm on title & summary
--   function:  public.search_steps(text, integer)
--
-- Language / transliteration note
-- --------------------------------
-- The tsvector uses the built-in `russian` config (Snowball stemmer + Russian
-- stopwords). Our content is Russian, so stemming lets "банк" match "банка",
-- "банки", "банковский", etc. Domain terms that are *transliterated Hebrew written
-- in Cyrillic* — «купат холим», «рав-кав», «теудат зеут», «сал клита» — are not in
-- any dictionary, so the stemmer keeps them close to verbatim (light suffix
-- stripping only). Exact/'-'-joined forms therefore match through FTS directly.
--   For everything the stemmer can't save — real typos («купат халим»), partial
-- words, wrong-ending transliterations — pg_trgm on title/summary provides a
-- similarity fallback. We use WORD similarity (the `<%` operator / word_similarity,
-- default threshold 0.6), not full-string `%`: a mistyped query word must still
-- match the title word it meant even inside a long multi-word title, where
-- full-string similarity would dilute to near-zero. search_steps() unions both:
-- FTS rank first, word-similarity as the safety net.

create extension if not exists pg_trgm with schema extensions;

-- Weighted search vector: title (A) > summary (B) > body (C). The explicit
-- 'russian'::regconfig form is IMMUTABLE, so it is legal in a STORED generated
-- column — which means the vector stays correct automatically on every
-- insert/update (content:import upsert included), with no trigger to maintain.
alter table public.steps
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('russian', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('russian', coalesce(body_md, '')), 'C')
  ) stored;

create index if not exists steps_search_vector_idx
  on public.steps using gin (search_vector);

-- Trigram indexes power the typo/partial fallback on the short, high-signal fields.
create index if not exists steps_title_trgm_idx
  on public.steps using gin (title extensions.gin_trgm_ops);
create index if not exists steps_summary_trgm_idx
  on public.steps using gin (summary extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- search_steps(query, max_results) — ranked step search.
-- ---------------------------------------------------------------------------
-- Returns matched steps (with their section's title + icon for the result tile)
-- ordered by relevance. A row matches if EITHER the FTS query hits the vector OR
-- a trigram similarity on title/summary clears the threshold (typo tolerance).
-- Rank blends normalized FTS rank with the best trigram similarity so exact
-- lexical hits sort above fuzzy ones. SECURITY INVOKER: steps are world-readable
-- under RLS, so no elevated privilege is needed.
create or replace function public.search_steps(p_query text, p_limit integer default 20)
returns table (
  slug          text,
  section_slug  text,
  title         text,
  summary       text,
  section_title text,
  section_icon  text,
  rank          real
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with q as (
    select
      websearch_to_tsquery('russian', p_query) as tsq,
      p_query                                   as raw
  )
  select
    s.slug,
    s.section_slug,
    s.title,
    s.summary,
    sec.title as section_title,
    sec.icon  as section_icon,
    (
      -- FTS rank (0 when no lexical match), weighted heavier than fuzzy.
      coalesce(ts_rank(s.search_vector, q.tsq), 0) * 1.0
      -- best WORD similarity across title/summary (typo/partial safety net).
      + greatest(
          word_similarity(q.raw, s.title),
          word_similarity(q.raw, coalesce(s.summary, ''))
        ) * 0.5
    )::real as rank
  from public.steps s
  join public.sections sec on sec.slug = s.section_slug
  cross join q
  where
    (q.tsq is not null and s.search_vector @@ q.tsq)
    or q.raw <% s.title
    or q.raw <% coalesce(s.summary, '')
  order by rank desc, s.sort_order asc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.search_steps(text, integer) to anon, authenticated;
