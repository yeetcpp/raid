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

# Install required packages including Docker CLI
RUN apk add --no-cache \
    bash \
    wget \
    curl \
    sed \
    nginx \
    docker-cli

# Install global npm packages
RUN npm install -g http-server

# Add a restricted user for terminal operations
RUN adduser -D -s /bin/bash player && \
    mkdir -p /home/player/files && \
    chown -R player:player /home/player && \
    echo 'cd /home/player/files 2>/dev/null || true' > /home/player/.bashrc && \
    chown player:player /home/player/.bashrc

# Set up restricted command environment for standalone mode
RUN mkdir -p /usr/local/restricted/bin /setup && \
    ln -s /bin/ls /usr/local/restricted/bin/ls && \
    ln -s /bin/cat /usr/local/restricted/bin/cat && \
    ln -s /bin/pwd /usr/local/restricted/bin/pwd && \
    ln -s /usr/bin/whoami /usr/local/restricted/bin/whoami && \
    ln -s /bin/uname /usr/local/restricted/bin/uname && \
    ln -s /bin/echo /usr/local/restricted/bin/echo && \
    ln -s /usr/bin/clear /usr/local/restricted/bin/clear && \
    ln -s /bin/mkdir /usr/local/restricted/bin/mkdir && \
    ln -s /bin/rm /usr/local/restricted/bin/rm && \
    ln -s /bin/chmod /usr/local/restricted/bin/chmod && \
    ln -s /bin/chown /usr/local/restricted/bin/chown && \
    ln -s /bin/date /usr/local/restricted/bin/date && \
    ln -s /bin/sed /usr/local/restricted/bin/sed && \
    ln -s /usr/bin/od /usr/local/restricted/bin/od && \
    ln -s /usr/bin/tr /usr/local/restricted/bin/tr

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Copy terminal bridge and scripts
COPY scripts/ ./scripts/
COPY setup/ /setup/

# Make setup scripts executable
RUN chmod +x /setup/*.sh 2>/dev/null || true

# Copy both nginx configurations
COPY nginx.standalone.conf /etc/nginx/nginx.standalone.conf
COPY nginx.compose.conf /etc/nginx/nginx.compose.conf

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
    echo 'echo "Detecting runtime mode..."' >> /app/start-all.sh && \
    echo 'if ping -c 1 terminal-bridge > /dev/null 2>&1; then' >> /app/start-all.sh && \
    echo '  echo "Docker Compose mode detected"' >> /app/start-all.sh && \
    echo '  cp /etc/nginx/nginx.compose.conf /etc/nginx/nginx.conf' >> /app/start-all.sh && \
    echo '  export STANDALONE_MODE=false' >> /app/start-all.sh && \
    echo 'else' >> /app/start-all.sh && \
    echo '  echo "Standalone mode detected"' >> /app/start-all.sh && \
    echo '  cp /etc/nginx/nginx.standalone.conf /etc/nginx/nginx.conf' >> /app/start-all.sh && \
    echo '  export STANDALONE_MODE=true' >> /app/start-all.sh && \
    echo '  echo "Starting terminal bridge on port 8787..."' >> /app/start-all.sh && \
    echo '  (cd /app/scripts && node terminal-bridge.cjs) &' >> /app/start-all.sh && \
    echo '  BRIDGE_PID=$!' >> /app/start-all.sh && \
    echo '  sleep 3' >> /app/start-all.sh && \
    echo 'fi' >> /app/start-all.sh && \
    echo 'echo "Starting main application on port 8080 (internal)..."' >> /app/start-all.sh && \
    echo 'cd /app' >> /app/start-all.sh && \
    echo 'http-server dist -p 8080 -c-1 &' >> /app/start-all.sh && \
    echo 'MAIN_PID=$!' >> /app/start-all.sh && \
    echo 'sleep 2' >> /app/start-all.sh && \
    echo 'echo "Starting nginx reverse proxy on port 80..."' >> /app/start-all.sh && \
    echo 'nginx -g "daemon off;" &' >> /app/start-all.sh && \
    echo 'NGINX_PID=$!' >> /app/start-all.sh && \
    echo 'echo "All services started successfully!"' >> /app/start-all.sh && \
    echo 'echo "- Access everything at: http://localhost:80"' >> /app/start-all.sh && \
    echo 'echo "  (Main app + Terminal bridge proxied through nginx)"' >> /app/start-all.sh && \
    echo 'wait' >> /app/start-all.sh && \
    echo 'cleanup' >> /app/start-all.sh && \
    chmod +x /app/start-all.sh

# Expose only port 80 (nginx proxies everything)
EXPOSE 80

# Health check for main service
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start all services
CMD ["/app/start-all.sh"]
