import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import tseslint from "typescript-eslint"
import eslintConfigPrettier from "eslint-config-prettier"

export default defineConfig(
  // ── Auto-generated / build artifacts ─────────────────────────────────────
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "lib/generated/**", // Prisma generated client
    "prisma/migrations/**", // raw SQL — not TypeScript
    "next-env.d.ts",
  ]),

  // ── Next.js recommended rules ─────────────────────────────────────────────
  ...nextVitals,
  ...nextTs,

  // ── TypeScript strict + stylistic type-checked rules ─────────────────────
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // ── Enable type-aware linting ─────────────────────────────────────────────
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // ── Plain JS/MJS config files — no type-checking available ───────────────
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // ── Rule overrides (TS only — type-checked rules need type info) ─────────
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },

  // ── Prettier last — disables all formatting rules that conflict ───────────
  eslintConfigPrettier,
)
