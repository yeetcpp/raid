# Single Port Docker Setup Guide

## ✅ Complete Working Solution

Your application now runs entirely on **port 80** using an internal nginx reverse proxy.

## Quick Start

### Option 1: Standalone Container (Requires Docker Socket)

```bash
docker run -p 80:80 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name rfid \
  -e FLAG="FLAG12#$%^" \
  rfid:latest
```

**Important:** This requires the `flipper-linux-terminal` container to be running separately for terminal commands to work:

```bash
# Start the terminal container first
docker run -d \
  --name flipper-linux-terminal \
  flipper-linux-terminal:latest

# Then start the main container
docker run -p 80:80 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --name rfid \
  -e FLAG="FLAG12#$%^" \
  rfid:latest
```

### Option 2: Docker Compose (Recommended)

Use the existing docker-compose setup which handles all containers automatically:

```bash
docker-compose up
```

This starts all three services:
- Main app (port 80)
- Terminal bridge (internal port 8787, proxied through /api)
- Linux terminal (execution environment)

## Architecture

```
Browser Request → Port 80 (nginx)
                    ├─ / → http-server:8080 (main app)
                    └─ /api/* → terminal-bridge:8787 (API)
                                    └─ docker exec → flipper-linux-terminal
```

## What Was Changed

1. **Added nginx** as reverse proxy inside the container
2. **Updated frontend** to use `/api` instead of `http://localhost:8787`
3. **Fixed terminal bridge** crash (ERR_HTTP_HEADERS_SENT) by preventing duplicate responses
4. **Added Docker CLI** to container so bridge can execute docker commands
5. **Only port 80** is exposed externally

## Files Modified

- `Dockerfile` - Added nginx, Docker CLI, updated startup script
- `nginx.conf` - Reverse proxy configuration
- `src/ui/TerminalUI.js` - Changed bridge URL to `/api`
- `scripts/terminal-bridge.cjs` - Fixed callback double-call bug, listen on 0.0.0.0

## Testing

### Test main app:
```bash
curl http://localhost/
```

### Test bridge session endpoint:
```bash
curl http://localhost/api/session
```

### Test terminal execution (requires linux-terminal container):
```bash
curl -X POST http://localhost/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command":"ls","computerId":1}'
```

## Troubleshooting

### "spawn docker ENOENT" error
- The container needs access to Docker socket: `-v /var/run/docker.sock:/var/run/docker.sock`
- The `flipper-linux-terminal` container must be running

### Terminal commands return 502
- Check if terminal bridge is running: `docker exec rfid ps aux | grep node`
- Check nginx error log: `docker exec rfid cat /var/log/nginx/error.log`

### Port already in use
- Stop existing container: `docker stop rfid && docker rm rfid`
- Or use a different port: `-p 8080:80`

## Production Deployment

For production, consider:
1. Using docker-compose for multi-container orchestration
2. Running nginx as a separate container
3. Using environment-specific FLAG values
4. Adding health checks and monitoring
