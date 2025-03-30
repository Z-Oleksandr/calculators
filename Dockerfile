FROM node:22.9.0-alpine3.20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3032

CMD ["npm", "run", "start"]