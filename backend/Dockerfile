# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:24-slim AS base
WORKDIR /app
# openssl é usado pelo motor de migrations do Prisma
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# ---------- dependências ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- desenvolvimento (docker-compose.dev.yml) ----------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
RUN mkdir -p /app/data
EXPOSE 3333
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# ---------- build ----------
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- produção (docker-compose.yml) ----------
FROM base AS prod
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/package.json /app/prisma.config.ts ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3333/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Aplica as migrations pendentes e sobe a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
