# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh

FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3000
ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["npm", "run", "dev"]

FROM base AS deps
RUN npm install

FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN npx prisma generate && npm run build

FROM node:${NODE_VERSION} AS production
ENV NODE_ENV=production
WORKDIR /usr/src/app

RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S app && adduser -S app -G app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prompts ./prompts
COPY scripts/entrypoint.sh ./scripts/entrypoint.sh
RUN chmod +x ./scripts/entrypoint.sh \
  && npm install --omit=dev \
  && npx prisma generate \
  && chown -R app:app /usr/src/app

COPY --from=build --chown=app:app /usr/src/app/dist ./dist

USER app
EXPOSE 3000
ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["node", "dist/server.js"]
