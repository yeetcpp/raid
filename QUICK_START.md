# 🐳 Docker Quick Reference - RFID Breach: Flipper Protocol

## ✅ Status: RUNNING

Your RFID Breach game is now running in Docker with full terminal bridge support!

- **Container Name:** rfid-game-container
- **Image Name:** rfid:latest
- **Ports:** 80 (game), 8787 (terminal bridge)
- **Status:** ✓ Healthy and Running
- **Flag:** Configurable via environment variable

---

## 🚀 Quick Commands

### Single Container (Recommended for Kubernetes/Production)

```bash
# Build the image
docker build -t rfid .

# Run with custom flag
docker run -p 80:80 -p 8787:8787 -e FLAG="CustomFlag@123" rfid

# Run with default flag
docker run -p 80:80 -p 8787:8787 rfid

# Run detached with custom flag
docker run -d -p 80:80 -p 8787:8787 -e FLAG="YourFlagHere" --name rfid-game rfid
```

### Access the Application
```bash
# Open game in browser
http://localhost

# Terminal bridge API (for debugging)
http://localhost:8787/session
```

---

## 🐳 Docker Compose (Alternative for Development)

### Start with Custom Flag
```bash
FLAG="CustomFlag@123" docker-compose up -d
```

### Start with Default Flag
```bash
docker-compose up -d
```

### View Container Status
```bash
docker-compose ps
```

### View Live Logs
```bash
docker-compose logs -f flipper-app
```

### Stop All Services
```bash
docker-compose down
```

### Rebuild and Restart
```bash
docker-compose up --build -d
```

---

## 🏷️ Flag Configuration

The game flag can be customized at runtime:

### Docker Run Method
```bash
# Custom flag
docker run -p 80:80 -p 8787:8787 -e FLAG="KUBE_FLAG@456" rfid

# Default flag (if no FLAG env var provided)
# FLAG="Default @123"
```

### Docker Compose Method
```bash
# Set flag via environment
FLAG="MyCustomFlag@789" docker-compose up

# Or edit docker-compose.yml to set permanent flag:
environment:
  - FLAG=PermanentFlag@123
```

### Kubernetes Deployment
```yaml
env:
- name: FLAG
  value: "KUBERNETES_FLAG@456"
```

---

## 📋 What's Inside

### Services in Single Container
- ✅ **Main Game** - RFID Breach Phaser 3 game on port 80
- ✅ **Terminal Bridge** - Backend API for in-game terminal on port 8787
- ✅ **Flag Injection** - Runtime flag replacement system

### Files Created
- ✅ **Dockerfile** - Consolidated build (all services)
- ✅ **docker-compose.yml** - Multi-service orchestration
- ✅ **.dockerignore** - Optimized build context
- ✅ **vite.config.js** - Build-time flag placeholder

### Architecture
1. **Builder Stage**
   - Uses Node 20-Alpine
   - Installs dependencies
   - Builds with Vite and flag placeholder
   - Creates optimized `dist/` folder

2. **Runtime Stage**
   - Uses fresh Node 20-Alpine
   - Installs required packages (bash, wget, etc.)
   - Starts terminal bridge on port 8787
   - Replaces flag placeholder with environment variable
   - Serves game on port 80

---

## 🔍 Container Management

### Basic Commands
```bash
# List running containers
docker ps

# View logs (shows flag injection + startup)
docker logs CONTAINER_ID

# Stop container
docker stop CONTAINER_ID

# Remove container
docker rm CONTAINER_ID

# Access container shell
docker exec -it CONTAINER_ID /bin/bash
```

### Advanced Debugging
```bash
# Check flag replacement in built files
docker exec -it CONTAINER_ID grep -r "FLAG" /app/dist/assets/

# Test terminal bridge endpoint
curl http://localhost:8787/session

# Monitor both services
docker exec -it CONTAINER_ID ps aux
```

---

## 🔧 Development Workflow

### Local Development
```bash
# For development with hot reload
npm run dev

# For testing production build locally
npm run build
npm run preview
```

### Container Testing
```bash
# Build and test quickly
docker build -t rfid . && docker run -p 80:80 -p 8787:8787 -e FLAG="TestFlag" rfid

# Or use docker-compose for full services
FLAG="DevFlag" docker-compose up --build
```

---

## 🌐 Port Mapping

| Port | Service | Description |
|------|---------|-------------|
| 80 | Main Game | RFID Breach Phaser 3 application |
| 8787 | Terminal Bridge | Backend API for in-game Linux terminal |

**Important:** Both ports must be exposed for full functionality!

---

## 📂 File Structure

```
RFID-Breach/
├── Dockerfile                 # Consolidated build (all services)
├── docker-compose.yml         # Multi-service setup
├── vite.config.js             # Flag placeholder injection
├── .dockerignore              # Build exclusions
├── QUICK_START.md             # This file
├── package.json               # Dependencies
├── src/                       # Game source code
├── scripts/                   # Terminal bridge backend
├── setup/                     # Setup utilities
├── dist/                      # Built output (inside container)
└── node_modules/              # Dependencies (inside container)
```

---

## ⚙️ Environment

- **Node.js:** 20-Alpine (lightweight, secure)
- **Game Engine:** Phaser 3
- **Build Tool:** Vite
- **Web Server:** http-server
- **Backend:** Node.js Express (terminal bridge)
- **Ports:** 80 (game), 8787 (API)
- **Platform:** Linux (supports both AMD64 and ARM64)

---

## 🐛 Troubleshooting

### Port Conflicts
If ports 80 or 8787 are already in use:
```bash
# Use different ports
docker run -p 8080:80 -p 8788:8787 -e FLAG="CustomFlag" rfid

# Update URLs accordingly
# Game: http://localhost:8080
# Bridge API: http://localhost:8788
```

### Terminal Bridge Not Working
Check logs for bridge startup:
```bash
docker logs CONTAINER_ID | grep "terminal-bridge"
```

Should see:
```
Starting terminal bridge on port 8787...
[terminal-bridge] listening on http://localhost:8787
```

### Flag Not Applied
Check flag injection in logs:
```bash
docker logs CONTAINER_ID | grep "FLAG"
```

Should see:
```
Applying FLAG: YourCustomFlag
FLAG replacement complete
```

### Container Won't Start
```bash
# Check detailed logs
docker logs CONTAINER_ID

# Rebuild everything clean
docker system prune -a
docker build --no-cache -t rfid .
```

---

## 🚢 Kubernetes Deployment

### Basic Deployment
```bash
# Build and tag for your registry
docker build -t your-registry/rfid:latest .
docker push your-registry/rfid:latest

# Deploy with custom flag
kubectl create deployment rfid-game --image=your-registry/rfid:latest
kubectl set env deployment/rfid-game FLAG="KUBE_FLAG@123"
kubectl expose deployment rfid-game --port=80 --target-port=80
kubectl port-forward service/rfid-game 8080:80
```

### Production Considerations
- Use persistent volumes for any game save data
- Configure resource limits (CPU/memory)
- Set up proper ingress for external access
- Monitor both ports (80 and 8787) for health checks

---

## 📊 Performance

- **Build Time:** ~20-30 seconds (includes all services)
- **Image Size:** ~350MB (includes terminal bridge dependencies)
- **Startup Time:** ~3-5 seconds (both services)
- **Memory Usage:** ~100-200MB idle

---

## 🔐 Security

- Uses minimal Alpine Linux image
- No dev dependencies in runtime
- Terminal bridge runs in restricted environment
- Flag injection happens at runtime (not stored in image)
- Health checks enabled for monitoring

---

## ✨ Features

- 🎮 **Full RFID hacking game** with Phaser 3
- 💻 **In-game Linux terminal** with restricted commands
- 🏷️ **Runtime flag configuration** for CTF/lab environments
- 🐳 **Single container deployment** (perfect for Kubernetes)
- 🔄 **Hot reload support** for development
- 📊 **Health monitoring** and logging

---

## 📖 More Information

For detailed technical documentation:
- **DOCKER_SETUP.md** - Full Docker configuration guide
- **RFID_SYSTEM_GUIDE.md** - Game mechanics and RFID system
- **TERMINAL_DOCKER_GUIDE.md** - Terminal bridge architecture

---

## ✅ Quick Checklist

1. ✅ **Build image:** `docker build -t rfid .`
2. ✅ **Run with flag:** `docker run -p 80:80 -p 8787:8787 -e FLAG="YourFlag" rfid`
3. ✅ **Access game:** http://localhost
4. ✅ **Verify terminal:** In-game terminal should work (no bridge errors)
5. ✅ **Check flag:** Complete the game and verify custom flag appears

---

**Created:** April 1, 2026  
**Status:** Production Ready with Kubernetes Support  
**Version:** v2.0 - Consolidated Container Architecture
