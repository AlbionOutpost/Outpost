import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    "**/.wrangler/**",
    "cloudflare/generated/**",
    "**/.qa/**",
    "node_modules/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    ".agents/**",
    ".codex/**",
    ".aws/**",
    "skill-system/vendor/**",
    // Downloaded reference-site evidence is not application source.
    "Scrape/**",
  ]),
]);
