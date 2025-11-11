FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

# install only runtime deps
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# copy the rest of the backend (context is /backend)
COPY . .

EXPOSE 3001
CMD ["node","server.js"]
