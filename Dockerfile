# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /app

# Build-time env for Vite (Coolify will inject these)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage (nginx) ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
