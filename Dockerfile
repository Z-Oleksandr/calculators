# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.22.3-alpine3.24

# --- Build stage: bundle client JS with webpack (dev dependencies stay here) ---
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY webpack.config.js ./
COPY src/script ./src/script
RUN npm run build

# --- Production dependencies only ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# --- Runtime stage ---
FROM ${NODE_IMAGE}
ENV NODE_ENV=production \
    PORT=3032
WORKDIR /app

# Remove npm/corepack/yarn from the runtime image: not needed to run the app,
# and they carry their own dependency trees (and CVEs).
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
           /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json app.js ./
COPY public ./public
COPY src/server ./src/server
COPY src/locales ./src/locales
COPY src/views ./src/views

USER node
EXPOSE 3032

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["node", "app.js"]
