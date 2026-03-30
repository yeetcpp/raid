# Real Linux Terminal via Docker

This project can now run a real Linux shell in Docker.

## 1. Build and open terminal (Debian default)

From the project root:

```bash
docker compose -f docker-compose.terminal.yml run --rm linux-terminal
```

This opens an interactive shell inside the container at /workspace.

## 2. Use Alpine instead (optional)

```bash
BASE_IMAGE=alpine:3.20 docker compose -f docker-compose.terminal.yml run --rm linux-terminal
```

## 3. Build once, run many times

```bash
docker compose -f docker-compose.terminal.yml build
docker compose -f docker-compose.terminal.yml run --rm linux-terminal
```

## 4. Example commands inside terminal

```bash
pwd
ls
cat package.json
uname -a
```

## Important note

The Phaser in-game terminal UI is a browser UI and cannot safely execute host-level Linux commands directly by itself.
This Docker setup gives you a real Linux terminal environment for command execution from your local machine.

## In-game terminal bridge (real docker execution)

To make the in-game terminal window execute real Docker commands:

1. Start the bridge server:

```bash
npm run terminal:bridge
```

2. In another terminal, start the game:

```bash
npm run dev
```

3. Open any in-game terminal and type commands.

Each command is executed by Docker (not simulated) via:

```bash
docker compose -f docker-compose.terminal.yml run --rm -T linux-terminal /bin/bash -lc "<your command>"
```

Workspace is mounted read-only for safety, so destructive commands cannot modify local project files.