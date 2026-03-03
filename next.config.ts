import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Produces a self-contained .next/standalone/ bundle for Docker.
  // Includes only the files needed to run the server — no devDependencies.
  output: "standalone",
  // boring-avatars ships as ESM; Next.js needs to transpile it for the server bundle.
  transpilePackages: ["boring-avatars"],
}

export default nextConfig
