FROM node:18-slim

# Install minimal dependencies needed for conversion
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    libreoffice-common \
    imagemagick \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]