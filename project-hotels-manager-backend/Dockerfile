# API PleasantStay (NestJS) — image de production multi-étapes.

# 1. Dépendances (versions exactes du package-lock.json)
FROM node:24-alpine AS deps
WORKDIR /app
# Outils de compilation pour les modules natifs éventuels (bcrypt).
RUN apk add --no-cache python3 make g++
# Registre npm (miroir possible si registry.npmjs.org est inaccessible ;
# les empreintes du package-lock.json restent vérifiées).
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --registry=${NPM_REGISTRY} --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

# 2. Compilation, puis suppression des dépendances de développement
FROM deps AS build
COPY . .
RUN npm run build && npm prune --omit=dev

# 3. Image d'exécution minimale, utilisateur non root
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/docs" > /dev/null || exit 1
# Initialisation de la base : docker compose run --rm api node dist/scripts/seed.js
CMD ["node", "dist/main.js"]
