# miniapp H5 生产构建（用户端；client 已冻结于 archive/client/）
# 多阶段：node 构建 uni-app H5 产物 → nginx 托管并反代 /api、/uploads 到 api:3001
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 生产 API 基址构建期注入（同源部署留空走相对路径 /api 即可）
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm run build:h5

FROM nginx:alpine

COPY --from=frontend-build /app/dist/build/h5 /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost/ || exit 1
