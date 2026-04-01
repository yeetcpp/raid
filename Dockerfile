# ============================================================
# Multi-stage Dockerfile for FlipperPhaser Project
# Build stage: Installs dependencies and builds the application
# Runtime stage: Serves the built application on port 80
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Accept FLAG as build argument
ARG FLAG="Default @123"
ENV FLAG=${FLAG}

# Build the application
RUN npm run build

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install http-server globally to serve the built application
RUN npm install -g http-server

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy package.json for reference
COPY package.json ./

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start the application
# Serve the dist folder on port 80
CMD ["http-server", "dist", "-p", "80", "-c-1"]
