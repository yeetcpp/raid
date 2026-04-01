--// @GekkoCooks 2026
# RFID Breach: Flipper Protocol

A 2D stealth logic puzzle game built with **Phaser 3** where you use a Flipper Zero to hack RFID terminals and exploit system flaws. Navigate through a facility, scan security badges, emulate access cards, and outsmart security systems.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [With npm](#with-npm)
  - [With Docker](#with-docker)
- [Available Scripts](#available-scripts)
- [Project Layout](#project-layout)
- [Key Systems](#key-systems)
- [RFID System Guide](#rfid-system-guide)
- [Terminal Bridge](#terminal-bridge)
- [Docker Setup](#docker-setup)

---

## 📖 Project Overview

**FlipperPhaser** is an interactive stealth puzzle game that combines:
- **2D Game Environment** - Top-down perspective gameplay using Phaser 3
- **RFID Emulation** - Scan and clone security badges from the environment
- **Door Access System** - Use emulated cards to unlock restricted areas
- **Hacking Mechanics** - Exploit RFID vulnerabilities to progress
- **UI Systems** - Terminal-based interface for game interactions

The game challenges players to think creatively about security exploits while navigating a facility with various access levels and security mechanisms.

---

## ✨ Features

- ✅ **2D Stealth Gameplay** - Navigate through facility zones
- ✅ **RFID Card System** - Scan, clone, and emulate security badges
- ✅ **Access Control** - Multi-level clearance system (L1, L2, L3 doors)
- ✅ **Quest System** - Track objectives and progression
- ✅ **Heat System** - Guard detection and alertness mechanics
- ✅ **Terminal UI** - In-game Flipper Zero interface
- ✅ **Hint System** - Contextual help throughout gameplay
- ✅ **Collision System** - Pre-calculated collision maps for levels
- ✅ **Terminal Bridge** - Optional terminal connection for extended gameplay
- ✅ **Multi-Platform** - Run locally with npm or containerized with Docker

---

## 📁 Project Structure

```
FlipperPhaser/
├── README.md                          # This file
├── package.json                       # npm dependencies and scripts
├── index.html                         # Main HTML entry point
├── vite.config.js                     # Vite bundler configuration
├── Dockerfile                         # Container image for production
├── Dockerfile.bridge                  # Container for terminal bridge
├── Dockerfile.terminal                # Container for terminal UI
├── docker-compose.yml                 # Docker Compose orchestration
├── docker-compose.terminal.yml        # Terminal-specific compose config
│
├── public/                            # Static assets
│   └── assets/
│       ├── collisions.json            # Pre-calculated collision data
│       └── [sprite/map assets]
│
├── src/                               # Source code
│   ├── main.js                        # Phaser game initialization
│   │
│   ├── assets/                        # Game asset imports
│   ├── entities/
│   │   └── Player.js                  # Player entity logic
│   │
│   ├── scenes/                        # Phaser scenes
│   │   ├── BootScene.js               # Loading and initialization
│   │   ├── GameScene.js               # Main gameplay scene
│   │   └── UIScene.js                 # UI overlay scene
│   │
│   ├── systems/                       # Game systems
│   │   ├── HeatSystem.js              # Guard detection/alertness
│   │   ├── HintSystem.js              # Contextual hints
│   │   ├── LogSystem.js               # Event logging
│   │   ├── QuestSystem.js             # Objective tracking
│   │   └── RFIDSystem.js              # RFID card scanning & emulation
│   │
│   └── ui/                            # UI components
│       ├── FlipperUI.js               # Main Flipper interface
│       └── TerminalUI.js              # Terminal mode interface
│
├── scripts/                           # Utility scripts
│   ├── terminal-bridge.cjs            # Terminal bridge server
│   └── restricted-entrypoint.sh       # Docker entrypoint
│
├── setup/                             # Setup utilities
│   └── generate_files.sh              # Initial file generation
│
├── [Root config files]
│   ├── QUICK_START.md                 # Quick reference guide
│   ├── DOCKER_SETUP.md                # Docker documentation
│   ├── DOCKER_FIXED.md                # Docker troubleshooting
│   ├── RFID_SYSTEM_GUIDE.md           # RFID mechanics guide
│   ├── TERMINAL_DOCKER_GUIDE.md       # Terminal mode setup
│   ├── .dockerignore                  # Docker build optimization
│   └── .gitignore                     # Git ignore rules
│
├── [Utility scripts]
│   ├── generate_student_sprite.cjs    # Sprite generation
│   ├── test_image.cjs                 # Image testing utility
│   ├── test_image.js                  # Image test (ES module)
│   └── regenerate_collisions.cjs      # Collision map regeneration
```

---

## 🔧 Prerequisites

### Minimum Requirements

- **Node.js** `v16+` (LTS recommended)
- **npm** `v7+`
- **Git**

### Optional

- **Docker** `v20.10+` and **Docker Compose** `v1.29+` (for containerized deployment)

### Verify Installation

```bash
# Check Node.js and npm
node --version    # Should be v16 or higher
npm --version     # Should be v7 or higher

# Check Docker (optional)
docker --version
docker-compose --version
```

---

## 🚀 Getting Started

### With npm

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd FlipperPhaser
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Start Development Server

```bash
npm run dev
```

- Opens at `http://localhost:5173` (Vite default)
- Hot module reloading enabled
- Auto-reload on file changes

#### 4. Open in Browser

Navigate to the displayed URL (usually `http://localhost:5173`) and start playing!

### With Docker

#### 1. Quick Start (Docker Compose)

```bash
# Build and run in one command
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

- Application available at `http://localhost`
- Container name: `flipper-phaser-container`
- Image name: `flipper-phaser:latest`

#### 2. View Logs

```bash
docker-compose logs -f flipper-app
```

#### 3. Stop the Container

```bash
docker-compose down
```

#### Alternative: Docker Run

```bash
# Build the image
docker build -t flipper-phaser:latest .

# Run the container
docker run -d -p 80:80 --name flipper-phaser-container flipper-phaser:latest

# View logs
docker logs -f flipper-phaser-container

# Stop the container
docker stop flipper-phaser-container
```

---

## 📦 Available Scripts

All scripts are defined in `package.json` and can be run with `npm run <script>`:

| Script | Command | Description |
|--------|---------|-------------|
| **dev** | `npm run dev` | Start Vite development server with hot reload |
| **build** | `npm run build` | Build optimized production bundle to `/dist` |
| **preview** | `npm run preview` | Preview production build locally |
| **terminal:bridge** | `npm run terminal:bridge` | Start terminal bridge server |

### Examples

```bash
# Development workflow
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Start terminal bridge
npm run terminal:bridge
```

---

## 🎮 Project Layout Details

### Source Code Organization

#### **src/main.js**
- Entry point for the Phaser game
- Initializes game config (960x720, arcade physics)
- Loads three scenes: Boot → Game → UI

#### **src/scenes/**
- **BootScene.js** - Asset loading, initialization, transitions to GameScene
- **GameScene.js** - Main gameplay with player, NPCs, environment, collision detection
- **UIScene.js** - Overlay UI, Flipper Zero interface, real-time game information

#### **src/systems/**
- **RFIDSystem.js** - Core RFID mechanics (scanning, cloning, emulation, access control)
- **HeatSystem.js** - Guard detection system, heat/alertness levels
- **QuestSystem.js** - Objective tracking and progression
- **HintSystem.js** - Context-sensitive help and hints
- **LogSystem.js** - Event logging for debugging and tracking

#### **src/ui/**
- **FlipperUI.js** - Interactive Flipper Zero interface for in-game actions
- **TerminalUI.js** - Terminal mode interface for extended gameplay

#### **src/entities/**
- **Player.js** - Player character logic, movement, interaction

---

## 🔐 Key Systems

### RFID System

The RFID system is the core mechanic of the game:

```javascript
RFID Card Structure:
{
  uid: string,              // Unique card ID (e.g., "UID_TECH_22B")
  clearance: number,        // Access level (1, 2, or 3)
  source: string,           // Where the card was scanned from
  label: string,            // Display name
  color: string             // Visual indicator (Green/Blue/Red)
}
```

**Workflow:**
1. **Scan** - Detect and clone RFID cards from environment
2. **Store** - Save cloned cards in `savedSignals[]`
3. **Emulate** - Activate emulation of a specific card
4. **Access** - Use emulated card to unlock doors

### Heat System

Tracks player detection by guards:
- Increases when in guard line of sight
- Decreases when hidden
- Different alert levels trigger different responses

### Quest System

Manages game objectives:
- Tracks completed and active quests
- Provides progression feedback
- Controls access to restricted areas

---

## 🖥️ RFID System Guide

### Complete Player Flow

#### Step 1: Scan L2 Card

1. Move player near the L2 badge in the Staff Office
2. Press **F** to open Flipper UI
3. Navigate to **RFID** → **SCAN**
4. Wait for scan progress bar (2.2 seconds)
5. Card cloned: **UID_TECH_22B** (Level 2, Blue)

#### Step 2: Activate Emulation

1. Open Flipper UI (**F**)
2. Navigate to **RFID** → **EMULATE**
3. Select the cloned card
4. Card is now being emulated

#### Step 3: Use Emulated Card

1. Navigate to the L2 door
2. Interact with door while card is emulated
3. Door unlocks if clearance level matches

---

## 🌐 Terminal Bridge

The Terminal Bridge enables extended gameplay through command-line interface:

```bash
# Start the terminal bridge
npm run terminal:bridge

# Or with Docker
docker-compose -f docker-compose.terminal.yml up
```

**Features:**
- Remote RFID control
- Advanced hacking mechanics
- Extended gameplay scenarios

For detailed setup, see [TERMINAL_DOCKER_GUIDE.md](TERMINAL_DOCKER_GUIDE.md)

---

## 🐳 Docker Setup

### Architecture

The project includes three Docker configurations:

#### **Dockerfile** (Production)
- Multi-stage build (faster, smaller images)
- Node 20-Alpine for building
- Fresh Node 20-Alpine for runtime
- Serves on port 80

#### **Dockerfile.bridge** (Terminal Bridge)
- Dedicated container for terminal bridge server
- Separate from main game application

#### **Dockerfile.terminal** (Terminal UI)
- Terminal-specific interface container
- For extended gameplay scenarios

### Docker Compose Files

#### **docker-compose.yml** (Main)
```yaml
Services:
- flipper-app (main game)
- Ports: 80:80
- Volume: ./dist (game files)
```

#### **docker-compose.terminal.yml** (Terminal Mode)
```yaml
Services:
- flipper-terminal (main game)
- terminal-bridge (bridge server)
- Ports: 3000-3001
```

### Common Docker Commands

```bash
# Build and start
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f flipper-app

# Stop services
docker-compose down

# Rebuild without starting
docker-compose build

# Remove containers and volumes
docker-compose down -v

# Check service status
docker-compose ps
```

---

## 🛠️ Development Workflow

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open browser to http://localhost:5173

# 4. Make changes to files in src/
# (Auto-reload happens automatically)

# 5. When ready to deploy, build for production
npm run build
```

### Building for Production

```bash
# Create optimized production bundle
npm run build

# Output is in ./dist/
# These files are served by Docker or production servers
```

### Debugging

- Check browser console for errors (`F12`)
- View Phaser debug output in console
- Review logs in `src/systems/LogSystem.js`

---

## 📚 Documentation Files

- **[QUICK_START.md](QUICK_START.md)** - Quick reference commands
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Docker configuration guide
- **[DOCKER_FIXED.md](DOCKER_FIXED.md)** - Docker troubleshooting
- **[RFID_SYSTEM_GUIDE.md](RFID_SYSTEM_GUIDE.md)** - Detailed RFID mechanics
- **[TERMINAL_DOCKER_GUIDE.md](TERMINAL_DOCKER_GUIDE.md)** - Terminal mode setup

---

## 🎯 Game Mechanics Overview

### Player Actions

- **Movement** - WASD or Arrow Keys
- **Interact** - E/Enter key
- **Flipper Menu** - F key
- **Scan RFID** - Via Flipper UI → RFID → SCAN
- **Emulate Card** - Via Flipper UI → RFID → EMULATE

### NPCs & Guards

- Guards patrol designated areas
- Heat system tracks player visibility
- Different alert levels affect guard behavior

### Doors & Access

- **Level 1** - Common areas, always accessible
- **Level 2** - Restricted staff areas, need L2 card
- **Level 3** - High security areas, need L3 card

---

## 🐛 Troubleshooting

### npm run dev not working

```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Docker port already in use

```bash
# Change port in docker-compose.yml
# Or stop other services using port 80
lsof -i :80
kill -9 <PID>
```

### Build errors

```bash
# Clear build cache
npm run build --force

# Or with Docker
docker-compose build --no-cache
```

---

## 📝 License

[Add your license information here]

---

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

---

## 📞 Support

For issues and questions:
- Check the documentation files in the root directory
- Review the [RFID_SYSTEM_GUIDE.md](RFID_SYSTEM_GUIDE.md) for gameplay mechanics
- Check Docker logs: `docker-compose logs`

---

## 🎬 Quick Command Reference

```bash
# Development
npm install                 # Install dependencies
npm run dev                 # Start dev server
npm run build              # Build for production
npm run preview            # Preview production build

# Docker Compose
docker-compose up --build   # Build and start
docker-compose up -d        # Start in background
docker-compose down         # Stop and remove
docker-compose logs -f      # View logs

# Terminal Bridge
npm run terminal:bridge     # Start terminal bridge

# Docker commands
docker ps                   # List running containers
docker logs <container>     # View container logs
docker exec -it <container> /bin/sh  # Access shell
```

---

**Last Updated:** April 2026

Happy hacking! 🎮🔐
