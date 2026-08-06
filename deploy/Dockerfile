FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/client/dist /usr/share/nginx/html

FROM node:20-alpine AS backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
EXPOSE 3001
CMD ["node", "index.js"]
