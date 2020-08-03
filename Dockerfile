FROM node:12

WORKDIR /usr/src/discord-bot-atlas
COPY package*.json ./

RUN npm install
COPY . .

CMD ["node","index.js"]