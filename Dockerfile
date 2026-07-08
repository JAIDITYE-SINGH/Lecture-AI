FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js .
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD npx prisma migrate deploy && node server.js
