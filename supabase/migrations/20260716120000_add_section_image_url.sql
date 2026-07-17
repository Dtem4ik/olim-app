-- Olim App — add an optional hero photo URL to guide sections.
--
-- Scope: ADDITIVE, ENTIRELY within the `public` schema. Nothing here references,
-- alters, or grants on `portfolio`. See AGENTS.md rules 6 & 7.
--
-- Objects touched (public only):
--   sections: + column image_url text (nullable; UI falls back to a colour tile)

alter table public.sections
  add column if not exists image_url text;
