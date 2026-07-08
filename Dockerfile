FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js .
COPY prisma ./prisma
COPY start.sh .
RUN chmod +x start.sh
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "server"]
