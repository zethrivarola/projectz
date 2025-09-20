# Multi-stage production build for Next.js with Bun
# Security hardened with non-root user and minimal attack surface

# Stage 1: Dependencies
FROM oven/bun:1.1.38-alpine AS deps
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install dependencies for Sharp and other native modules
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Stage 2: Builder
FROM oven/bun:1.1.38-alpine AS builder
WORKDIR /app

# Install dependencies needed for build
RUN apk add --no-cache libc6-compat

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client
RUN bunx prisma generate

# Build the application
RUN bun run build

# Stage 3: Production runner
FROM oven/bun:1.1.38-alpine AS runner
WORKDIR /app

# Security: Install security updates
RUN apk upgrade --no-cache
RUN apk add --no-cache curl dumb-init

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["bun", "server.js"]
