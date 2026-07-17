# Image provenance & licenses

All raster photography shipped in the app is **self-hosted** (converted to `.webp`,
committed under `public/img/`) — never hot-linked. This file is the inventory and
license record. Added in Phase 6 housekeeping to close the provenance debt left by
the Phase 5.5 native-UI redesign.

## Source & license

- **Source:** [Unsplash](https://unsplash.com).
- **License:** the [Unsplash License](https://unsplash.com/license) — free to use
  for commercial and non-commercial purposes, no permission needed. Attribution is
  appreciated but **not required**, so the app ships none. The only prohibitions
  (not applicable here) are reselling the photos unmodified as stock and building a
  competing photo service.
- **Processing:** downloaded, cropped to the tile/hero aspect ratios, and encoded
  to `webp` for size. Served locally via `next/image` (see
  `next.config.ts` → `images.remotePatterns` still allows `images.unsplash.com` for
  any future direct use, but nothing hot-links today).

## Inventory

| File | Used by | Subject |
|---|---|---|
| `public/img/hero-telaviv.webp` | Home hero (`components/home/home-view.tsx`) | Tel Aviv skyline / coast |
| `public/img/sections/banks-and-money.webp` | Section `banks-and-money` | Banking / money |
| `public/img/sections/healthcare.webp` | Section `healthcare` | Healthcare / clinic |
| `public/img/sections/olim-benefits.webp` | Section `olim-benefits` | Documents / benefits |
| `public/img/sections/rent.webp` | Section `rent` | Housing / apartment |
| `public/img/sections/work.webp` | Section `work` | Work / office |
| `public/img/sections/transport.webp` | Section `transport` | Public transport |
| `public/img/sections/mobile-internet.webp` | Section `mobile-internet` | Phone / connectivity |
| `public/img/sections/hebrew-ulpan.webp` | Section `hebrew-ulpan` | Study / Hebrew |

The `sections.<slug>.image_url` column (migration `20260716120000_add_section_image_url.sql`)
points each section row at its file; the home hero path is referenced directly in
the component.

## Known debt

The **exact per-photo Unsplash URLs and photographer credits were not recorded**
when the images were selected during the redesign. The blanket Unsplash License
covers usage without attribution, so nothing is legally missing — but for good
citizenship and reproducibility we should backfill a `source_url` + photographer
per file here when the originals are re-identified. Any future image **must** be
added to this table with its Unsplash URL at selection time. If a candidate image
ever lacks a clear free license, it does not ship.
