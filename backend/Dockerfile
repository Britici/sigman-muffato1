# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
