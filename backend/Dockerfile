FROM node:22-alpine AS deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY shared ./shared
WORKDIR /app/backend
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN apk add --no-cache chromium font-noto ca-certificates
RUN npm ci --omit=dev --no-audit --no-fund

WORKDIR /app
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma ./backend/prisma
COPY backend/prisma.config.ts ./backend/prisma.config.ts
COPY backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh

RUN chmod +x /app/backend/docker-entrypoint.sh && mkdir -p /app/logs

WORKDIR /app/backend
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/backend/src/main.js"]
