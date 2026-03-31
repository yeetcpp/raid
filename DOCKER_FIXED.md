# ✅ Docker Setup Complete - FlipperPhaser with Terminal Bridge

## Status: FULLY OPERATIONAL

Both services are now running and integrated:

### 🎮 Main Application
- **URL:** http://localhost
- **Port:** 80
- **Status:** Running ✓
- **Container:** `flipper-phaser-container`
- **Image:** `flipper-phaser:latest`

### 🔌 Terminal Bridge Service
- **URL:** http://localhost:8787
- **Port:** 8787
- **Status:** Running ✓
- **Container:** `flipper-terminal-bridge`
- **Image:** `flipper-terminal-bridge:latest`
- **Purpose:** Executes terminal commands from the in-game terminal

---

## 🆕 What Changed

### Dockerfile.bridge (NEW)
- Uses `node:20-bookworm` (Debian-based) for better Docker CLI support
- Installs Docker CLI (`docker.io`) from apt
- Runs the terminal bridge Node.js service
- Exposes port 8787

### docker-compose.yml (UPDATED)
- Now orchestrates both `flipper-app` and `terminal-bridge` services
- `flipper-app` depends on `terminal-bridge` (starts terminal bridge first)
- Both services are on the same `flipper-network`
- Terminal bridge has access to Docker socket (`/var/run/docker.sock`)
- Terminal bridge has read-only access to project files (ro)

### TerminalUI.js (UPDATED)
- Auto-detects bridge URL based on hostname
- Works both locally and in Docker:
  - **Docker mode:** Uses `http://terminal-bridge:8787` (container dns)
  - **Local mode:** Uses `http://localhost:8787` (localhost)
- Dynamic error messages for both modes

---

## 🚀 Quick Commands

### Start Everything
```bash
docker-compose up -d
```

### Stop Everything
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f flipper-app
docker-compose logs -f terminal-bridge
```

### Rebuild
```bash
docker-compose up --build -d
```

### Check Status
```bash
docker-compose ps
```

---

## 🎮 Using the Game

1. Navigate to **http://localhost**
2. Open the terminal (in-game)
3. Type commands like `ls`, `cat`, ``pwd`, etc.
4. Terminal commands are executed by the terminal bridge service running in the container

---

## 🔧 How It Works

```
┌─────────────────┐
│  Browser Game   │ (http://localhost:80)
│  (Port 80)      │
└────────┬────────┘
         │
         │ (fetch command)
         ▼
┌─────────────────────────────┐
│  Terminal Bridge Service    │ (http://localhost:8787)
│  (Port 8787)                │
│  - Runs in Docker container │
│  - Has access to docker CLI │
│  - Mounts /var/run/docker.socket
└─────────────────────────────┘
         │
         │ (run docker compose)
         ▼
┌─────────────────────────────┐
│  Linux Terminal Container   │
│  (docker-compose.terminal.yml)
│  - Executes commands        │
│  - Returns output           │
└─────────────────────────────┘
```

---

## 📊 Services Network

Both services communicate over the `flipper-network` bridge:

```
[flipper-network]
├── flipper-app (port 80)
└── terminal-bridge (port 8787)
```

Internal communication uses container DNS names:
- `flipper-app` talks to `terminal-bridge:8787`

---

## ✨ Features

✅ **Both services auto-start together**  
✅ **Terminal bridge has full Docker access**  
✅ **Auto-detects local vs Docker mode**  
✅ **Health checks on both services**  
✅ **Persistent logging**  
✅ **Network isolation**  
✅ **Dependency management** (app waits for bridge)  

---

## 🆘 Troubleshooting

### Terminal shows Docker errors
- Ensure both services are running: `docker-compose ps`
- Check terminal bridge logs: `docker-compose logs terminal-bridge`

### Can't connect to terminal bridge
- Verify port 8787 is mapped: `docker-compose ps`
- Check if bridge is healthy: `docker-compose ps`

### Port already in use
Edit `docker-compose.yml` to change port mappings, then restart

### Rebuild needed
```bash
docker-compose down
docker system prune -a
docker-compose up --build -d
```

---

## 📁 File Structure

```
FlipperPhaser/
├── Dockerfile              # Main app build
├── Dockerfile.bridge       # Terminal bridge (NEW)
├── docker-compose.yml      # Services orchestration (UPDATED)
├── .dockerignore          # Build exclusions
├── src/
│   └── ui/TerminalUI.js   # Terminal UI (UPDATED)
├── scripts/
│   └── terminal-bridge.cjs # Terminal bridge API (now running in container)
└── dist/                   # Built app (served on port 80)
```

---

## 🎯 Next Steps

1. ✅ Game is running at http://localhost
2. ✅ Terminal bridge is up at localhost:8787
3. Test the terminal in-game
4. Any commands should now execute properly through the Docker bridge

---

**All systems operational!** 🚀
