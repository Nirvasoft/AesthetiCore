# =============================================================================
# AesthetiCore API — Multi-stage Dockerfile
# =============================================================================

# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy workspace-level configs
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Install ALL dependencies (devDeps needed for build)
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy everything (node_modules from deps, plus source)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .

# Generate Prisma client
RUN cd apps/api && npx prisma generate --schema=prisma/schema.prisma

# Build the API via Nx
RUN pnpm exec nx build api

# ── Stage 3: Production image ─────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

ENV NODE_ENV=production

# Copy built output
COPY --from=build /app/apps/api/dist ./dist

# Copy Prisma schema + migrations (needed for prisma migrate deploy)
COPY --from=build /app/apps/api/prisma ./prisma

# Copy workspace configs for pnpm install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client in production image
RUN cd apps/api && npx prisma generate --schema=../prisma/schema.prisma 2>/dev/null || \
    npx prisma generate --schema=prisma/schema.prisma

# Copy generated Prisma client from build stage as fallback
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=build /app/apps/api/node_modules/@prisma ./apps/api/node_modules/@prisma

EXPOSE 8080

# Run migrations then start the API
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy --schema=prisma/schema.prisma && cd /app && node dist/main.js"]
