FROM node:18-slim
# Install conversion tools
RUN apt-get update && apt-get install -y \
    libreoffice \
    imagemagick \
    && apt-get clean
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]