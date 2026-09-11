# admin-pc 生产构建：node 构建 Vue3 SPA → nginx 托管并反代 /api、/uploads 到 api:3001
FROM node:20-alpine AS admin-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=admin-build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost/ || exit 1