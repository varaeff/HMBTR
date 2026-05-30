FROM node:22-alpine AS deps
WORKDIR /app/front
COPY front/package*.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/front/node_modules ./front/node_modules
COPY front ./front
COPY shared ./shared
WORKDIR /app/front
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY front/nginx.conf /etc/nginx/conf.d/default.conf
COPY front/docker-entrypoint.d/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
COPY front/env-config.template.js /usr/share/nginx/html/env-config.template.js
COPY --from=builder /app/front/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-env-config.sh
EXPOSE 80
