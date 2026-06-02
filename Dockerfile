FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 3000

VOLUME ["/app/data"]

ENV NODE_ENV=production

CMD ["node", "server.js"]
