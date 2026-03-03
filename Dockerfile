# ── Stage 1: Install all dependencies ─────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@10

# Copy manifests only — layer is cached until these change
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile


# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Regenerate the Prisma client for the linux/musl (Alpine) target.
# This project uses @prisma/adapter-pg (driver adapter) — the generated client
# is pure JS with no native query-engine binary. No binaryTargets needed in schema.prisma.
RUN pnpm prisma generate

# NEXT_TELEMETRY_DISABLED silences the telemetry prompt during CI/CD builds.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build


# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next.js standalone server.
# The standalone output bundles a trimmed node_modules alongside server.js.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Prisma generated client lives at a custom path (lib/generated/prisma/).
# Next.js nft (node-file-trace) should trace it, but we copy explicitly for safety
# in case dynamic requires in the generated client are missed by the tracer.
COPY --from=builder /app/lib/generated ./lib/generated

EXPOSE 3000

# Migrations are NOT run here — that is the job of the `migrate` service in
# docker-compose, which runs before this container starts.
CMD ["node", "server.js"]
