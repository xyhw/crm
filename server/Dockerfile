FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /app/uploads

ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/app/uploads

EXPOSE 3001

CMD ["node", "index.js"]
