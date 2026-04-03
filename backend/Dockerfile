# ---- Stage 1: Build ----
FROM node:24-slim AS builder

WORKDIR /app

# Install openssl for Prisma engine (required on Debian Bookworm / node:slim)
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better layer caching
COPY package*.json ./

# Copy prisma schema BEFORE npm install (postinstall runs prisma generate)
COPY prisma ./prisma

# Install dependencies + run prisma generate via postinstall
RUN npm install

# Copy the rest of the source code
COPY . .

# ---- Stage 2: Production ----
FROM node:24-slim

WORKDIR /app

# Install openssl — required by Prisma query engine at runtime on Debian Bookworm
RUN apt-get update -qq && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy only production deps + source from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma.config.js ./

# Expose the backend port
EXPOSE 4000

# Start the server
CMD ["node", "src/index.js"]
