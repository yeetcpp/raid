# ============================================================
# Consolidated Dockerfile for FlipperPhaser Project
# Includes: Main app + Terminal bridge in single container
# ============================================================

# Stage 1: Build the main application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build the application (FLAG gets replaced at runtime)
RUN npm run build

# ============================================================
# Stage 2: Consolidated Runtime
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Install required packages
RUN apk add --no-cache \
    bash \
    wget \
    curl \
    sed

# Install global npm packages
RUN npm install -g http-server

# Add a restricted user for terminal operations
RUN adduser -D -s /bin/bash player && \
    mkdir -p /home/player/files && \
    chown -R player:player /home/player

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Copy terminal bridge and scripts
COPY scripts/ ./scripts/
COPY setup/ ./setup/

# Install terminal bridge dependencies
RUN cd /app/scripts && npm install

# Create startup script
RUN echo '#!/bin/bash' > /app/start-all.sh && \
    echo 'cleanup() {' >> /app/start-all.sh && \
    echo '  echo "Stopping all services..."' >> /app/start-all.sh && \
    echo '  kill $(jobs -p) 2>/dev/null || true' >> /app/start-all.sh && \
    echo '  exit 0' >> /app/start-all.sh && \
    echo '}' >> /app/start-all.sh && \
    echo 'trap cleanup SIGTERM SIGINT' >> /app/start-all.sh && \
    echo 'FLAG_VALUE="${FLAG:-Default @123}"' >> /app/start-all.sh && \
    echo 'echo "Applying FLAG: $FLAG_VALUE"' >> /app/start-all.sh && \
    echo 'sed -i "s/__FLAG_PLACEHOLDER__/${FLAG_VALUE}/g" /app/dist/assets/*.js' >> /app/start-all.sh && \
    echo 'echo "FLAG replacement complete"' >> /app/start-all.sh && \
    echo 'echo "Starting terminal bridge on port 8787..."' >> /app/start-all.sh && \
    echo 'cd /app/scripts' >> /app/start-all.sh && \
    echo 'node terminal-bridge.cjs &' >> /app/start-all.sh && \
    echo 'BRIDGE_PID=$!' >> /app/start-all.sh && \
    echo 'echo "Waiting for terminal bridge to start..."' >> /app/start-all.sh && \
    echo 'sleep 3' >> /app/start-all.sh && \
    echo 'echo "Starting main application on port 80..."' >> /app/start-all.sh && \
    echo 'cd /app' >> /app/start-all.sh && \
    echo 'http-server dist -p 80 -c-1 &' >> /app/start-all.sh && \
    echo 'MAIN_PID=$!' >> /app/start-all.sh && \
    echo 'echo "All services started successfully!"' >> /app/start-all.sh && \
    echo 'echo "- Main app: http://localhost:80"' >> /app/start-all.sh && \
    echo 'echo "- Terminal bridge: http://localhost:8787"' >> /app/start-all.sh && \
    echo 'wait' >> /app/start-all.sh && \
    echo 'cleanup' >> /app/start-all.sh && \
    chmod +x /app/start-all.sh

# Expose both ports
EXPOSE 80 8787

# Health check for main service
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start all services
CMD ["/app/start-all.sh"]
