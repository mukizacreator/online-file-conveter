FROM node:18-slim

# Install core dependencies for conversion
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    imagemagick \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

CMD ["node", "server.js"]