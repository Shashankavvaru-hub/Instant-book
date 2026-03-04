# ---- Stage 1: Build ----
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

RUN npm install

# Copy source and build Next.js
COPY . .

RUN npm run build

# ---- Stage 2: Production ----
FROM node:24-alpine

WORKDIR /app

# Copy the built Next.js output and required files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.ts ./

# Install only production dependencies
RUN npm install --omit=dev

# Expose Next.js default port
EXPOSE 3000

CMD ["npm", "start"]
