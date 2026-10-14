# Imagem pinada por versão menor. Para builds reprodutíveis em produção, fixe também
# o digest:  FROM node:22-alpine@sha256:<digest>  (docker buildx imagetools inspect node:22-alpine)
FROM node:26-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependências de produção (cache de camada separado do código)
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Código-fonte (o .dockerignore exclui .env, node_modules, uploads e scripts de dev)
COPY --chown=node:node . .

# O volume nomeado `backend_uploads` herda dono/permissão deste diretório na primeira
# criação — por isso ele já nasce com dono `node` (um volume criado como root quebraria o upload).
RUN mkdir -p /app/uploads/documentos && chown -R node:node /app/uploads

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health >/dev/null || exit 1

CMD ["node", "src/server.js"]
