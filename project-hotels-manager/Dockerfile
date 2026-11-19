# Front-office PleasantStay (Next.js) — image de production multi-étapes.

FROM node:22-alpine AS dependencies
WORKDIR /app
# Registre npm (miroir possible si registry.npmjs.org est inaccessible ;
# les empreintes du package-lock.json restent vérifiées).
ARG NPM_REGISTRY=https://registry.npmjs.org
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --registry=${NPM_REGISTRY} --no-audit --no-fund --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# URL de l'API vue par le NAVIGATEUR (intégrée au bundle au moment du build).
ARG NEXT_PUBLIC_API_URL=http://localhost:3002/api
ARG NEXT_PUBLIC_BACKEND_API_URL=http://localhost:3002/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_BACKEND_API_URL=${NEXT_PUBLIC_BACKEND_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Exécution : serveur autonome, sans node_modules complets ni droits root.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3001 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3001/ > /dev/null || exit 1
CMD ["node", "server.js"]
