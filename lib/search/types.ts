/** Shared shapes for the search API + UI (Phase 6a). */

export interface SearchStepResult {
  slug: string;
  section_slug: string;
  title: string;
  summary: string | null;
  section_title: string;
  section_icon: string | null;
}

export interface SearchSectionResult {
  slug: string;
  title: string;
  icon: string | null;
}

export interface SearchResults {
  steps: SearchStepResult[];
  sections: SearchSectionResult[];
  /** Which path served the results — surfaced for debugging / the phase report. */
  source: "supabase" | "fixtures";
}
