# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --package-lock-only && npm ci

# Download D3.js v7
RUN mkdir -p assets && \
    wget -q -O assets/d3.min.js https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js

# Build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/assets ./assets
COPY package.json ./

VOLUME /project
ENV BLOO_PROJECT_ROOT=/project
ENV BLOO_STORAGE_ROOT=/project/.bloo
ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]
