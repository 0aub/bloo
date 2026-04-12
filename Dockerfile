# Stage 1: Build backend
FROM node:22-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install --package-lock-only && npm ci
RUN mkdir -p assets && \
    wget -q -O assets/d3.min.js https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/ui
COPY ui/package.json ./
RUN npm install --package-lock-only && npm ci
COPY ui/ ./
RUN npm run build

# Stage 3: Runtime (lightweight, no Chromium)
FROM node:22-alpine
WORKDIR /app
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/assets ./assets
COPY --from=frontend-builder /app/ui/dist ./dist/public
COPY package.json ./

VOLUME /project
ENV BLOO_PROJECT_ROOT=/project
ENV BLOO_STORAGE_ROOT=/project/.bloo
ENV BLOO_HTTP_PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
