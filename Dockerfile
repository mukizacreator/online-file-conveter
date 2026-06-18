FROM node:18-slim

# Install LibreOffice, GraphicsMagick/ImageMagick, and ffmpeg
RUN apt-get update && apt-get install -y \
    libreoffice-common \
    libreoffice-writer \
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