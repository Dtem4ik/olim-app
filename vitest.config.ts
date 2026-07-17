import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "components/ui/**",
        "lib/supabase/database.types.ts",
        // Route-level view compositions + analytics/error providers are
        // integration-tested by the Playwright e2e flow (Phase 4 DoD), not unit
        // coverage. Unit coverage targets pure lib logic + reusable primitives.
        "components/home/**",
        "components/guides/**",
        "components/plan/**",
        "components/profile/**",
        "components/analytics-provider.tsx",
        "lib/plan/use-progress.ts",
        // Navigation / browser-integration UI exercised by the Playwright flow, not
        // unit coverage: the top progress bar (link-click + pathname listeners) and
        // the search entry button (opens /search, primes the mobile keyboard).
        "components/top-progress-bar.tsx",
        "components/search-button.tsx",
        // next/og image rendering (satori/runtime) — not unit-testable; verified by
        // the e2e OG fetch (200 image/png) and the shared-plan/SEO screenshots.
        "lib/og/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});
