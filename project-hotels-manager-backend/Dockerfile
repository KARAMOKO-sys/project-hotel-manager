FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]
