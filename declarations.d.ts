// CSS side-effect imports (e.g. app/globals.css)
// next-env.d.ts references .next/dev/types/routes.d.ts which only exists after
// running the dev server. Until then the language server can't resolve these.
// This shim fixes the TS-2882 diagnostic at rest; tsc itself is unaffected.
declare module "*.css" {}
