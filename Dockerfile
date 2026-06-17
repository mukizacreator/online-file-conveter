# Use a lightweight Node image
FROM node:18-slim

# Install LibreOffice and ImageMagick
RUN apt-get update && apt-get install -y \
    libreoffice \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy everything else from your local folder into the container
COPY . .

# Expose the port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]