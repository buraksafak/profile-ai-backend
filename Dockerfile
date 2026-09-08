# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
WORKDIR /usr/src/app

ENV TZ=Europe/Istanbul \
    npm_config_update_notifier=false \
    npm_config_fund=false \
    npm_config_audit=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

FROM base AS deps
ENV NODE_ENV=development
RUN npm ci

FROM deps AS development
ENV NODE_ENV=development
COPY . .
RUN chmod +x ./scripts/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM deps AS build
ENV NODE_ENV=production
COPY tsconfig.json ./
COPY src ./src
COPY prompts ./prompts
RUN npx prisma generate && npm run build

FROM base AS production
ENV NODE_ENV=production \
    TZ=Europe/Istanbul \
    HOME=/usr/src/app

RUN groupadd --system app \
  && useradd --system --gid app --home-dir /usr/src/app --no-create-home app

COPY prompts ./prompts
RUN npm ci --omit=dev \
  && npx prisma generate \
  && mkdir -p /usr/src/app/logs \
  && chown -R app:app /usr/src/app

COPY --from=build --chown=app:app /usr/src/app/dist ./dist

USER app
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=45s --retries=8 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["node", "dist/server.js"]
