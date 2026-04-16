FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

COPY . .

# API_INTERNAL_URL is used by next.config.js rewrites at build time.
# Defaults to the docker-compose service name so it works out of the box.
ARG API_INTERNAL_URL=http://api:5000
ENV API_INTERNAL_URL=$API_INTERNAL_URL

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
# Bind to all interfaces so health checks via localhost work inside the container
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
