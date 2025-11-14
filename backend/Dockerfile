# Simple one-stage build for the MEMOPYK Devis backend
FROM node:20-alpine

# Work in /app inside the container
WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the backend source (server.js, src/, tsconfig, etc.)
COPY . .

# Build TypeScript to ./dist (tsup)
RUN npm run build

# Expose the API port
EXPOSE 3001

# Start the Express server (which will require('./dist/routes'))
CMD ["node", "server.js"]
