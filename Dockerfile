FROM node:18-slim

RUN apt-get update && apt-get install -y libreoffice imagemagick && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Change this to execute node directly, bypassing npm during runtime
CMD ["node", "server.js"]