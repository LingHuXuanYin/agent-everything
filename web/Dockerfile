# agent-everything · 前端（静态站）
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/
RUN npm ci

COPY data ./data
COPY web ./web
RUN npm run build --workspace=@agent-everything/web

FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
