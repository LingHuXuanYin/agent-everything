# agent-everything · 数据 API
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN npm ci

COPY data ./data
COPY server ./server
RUN npm run build --workspace=@agent-everything/server

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/server/dist ./server/dist
COPY data ./data

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
