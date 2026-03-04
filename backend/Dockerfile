# ---- Stage 1: Build ----
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy the rest of the source code
COPY . .

# ---- Stage 2: Production ----
FROM node:24-alpine

WORKDIR /app

# Copy only production deps + source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma.config.js ./

# Expose the backend port
EXPOSE 5000

# Run Prisma generate then start the server
CMD ["node", "src/index.js"]
