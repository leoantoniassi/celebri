# Imagens pinadas por versão. Em produção, fixe também o digest (@sha256:...).
# ---- Build Stage ----
FROM node:26-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage (Nginx sem root, escuta 8080) ----
# nginx-unprivileged roda como usuário `nginx` (UID 101) e grava pid/cache em /tmp,
# o que permite `read_only: true` + tmpfs em /tmp no compose.
FROM nginxinc/nginx-unprivileged:stable-alpine

COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
