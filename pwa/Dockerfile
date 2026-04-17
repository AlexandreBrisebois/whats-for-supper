# =============================================================================
# Stage 1 — Base
# =============================================================================
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl

# =============================================================================
# Stage 2 — Development
# =============================================================================
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENTRYPOINT ["npm", "run", "dev"]

# =============================================================================
# Stage 3 — Build
# =============================================================================
FROM base AS build
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# =============================================================================
# Stage 4 — Production (Next.js Standalone)
# =============================================================================
FROM base AS production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
# Allow runtime override of API_INTERNAL_URL
ENV API_INTERNAL_URL=http://api:5000

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
