# Single image: the api also serves the built web app (WEB_DIST_DIR).
# Build:  docker compose up -d --build     (see README for details)

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# ── build: install everything, compile api and web ───────────────────────
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

# ── runtime: production deps only + build output ─────────────────────────
FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4060 \
    WEB_DIST_DIR=/app/web/dist
# Workspace packages ship as TypeScript sources and are loaded through tsx at
# runtime, so the sources are copied as well, not just dist.
COPY . .
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/web/dist ./web/dist

USER node
WORKDIR /app/api
EXPOSE 4060
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4060/healthz >/dev/null || exit 1
CMD ["node", "--import", "tsx", "dist/index.js"]
