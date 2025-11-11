# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (supports root or backend-level package.json)
COPY package*.json ./
COPY backend/package*.json ./backend/ 2>/dev/null || true
RUN if [ -f package.json ]; then npm ci; fi
RUN if [ -f backend/package.json ]; then cd backend && npm ci; fi

# Copy backend sources
COPY backend/ ./backend/

# Build if script exists
WORKDIR /app/backend
RUN npm run build || echo "No build step, continuing"

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Minimal runtime payload
COPY --from=build /app/backend/package*.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/src ./src

EXPOSE 3001
CMD sh -lc 'npm run start:prod || npm start || node dist/server.js'
