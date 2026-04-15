# ─────────────────────────────────────────────
# Stage 1: Builder – compile TypeScript
# ─────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source & config
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY index.ts ./

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ─────────────────────────────────────────────
# Stage 2: Production image
# ─────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL for Prisma library engine
RUN apk add --no-cache openssl

# Only install production dependencies (--ignore-scripts skips husky/prepare)
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output and Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# TLS certs (mounted at runtime via volume or COPY at deploy time)
# Mount certs directory: -v ./certs:/app/certs
RUN mkdir -p /app/certs

EXPOSE 3000

# Healthcheck using the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
