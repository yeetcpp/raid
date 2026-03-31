# Docker Setup for FlipperPhaser

Complete Docker configuration for containerizing and running the FlipperPhaser project.

## Files Included

- **Dockerfile** - Multi-stage build configuration (Builder + Runtime)
- **docker-compose.yml** - Docker Compose orchestration
- **.dockerignore** - Excludes unnecessary files from build context

---

## Quick Start with Docker Compose

### 1. Build and Start the Container

```bash
docker-compose up --build
```

This will:
- Build the Docker image
- Create and start the container
- Map port 80 on your machine to port 80 in the container
- Application will be available at `http://localhost`

### 2. Run in Background

```bash
docker-compose up -d --build
```

### 3. View Logs

```bash
docker-compose logs -f flipper-app
```

### 4. Stop the Container

```bash
docker-compose down
```

---

## Using Docker Run Command

If you prefer to use `docker run` directly:

### 1. Build the Image

```bash
docker build -t flipper-phaser:latest .
```

### 2. Run the Container

```bash
docker run -p 80:80 flipper-phaser-container flipper-phaser:latest
```

**Note:** In Docker, the image name goes at the end. The full command structure is:
```bash
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

So the correct usage is:
```bash
docker run -p 80:80 --name flipper-phaser-container flipper-phaser:latest
```

### 3. Run in Background

```bash
docker run -d -p 80:80 --name flipper-phaser-container flipper-phaser:latest
```

### 4. Stop the Container

```bash
docker stop flipper-phaser-container
```

### 5. Remove the Container

```bash
docker rm flipper-phaser-container
```

---

## Accessing the Application

Once running, open your browser and navigate to:

```
http://localhost
```

Or if using a different machine/IP:
```
http://<your-ip>:80
```

---

## Docker Compose Commands Reference

| Command | Description |
|---------|-------------|
| `docker-compose up` | Build and start services |
| `docker-compose up -d` | Start in background (detached) |
| `docker-compose up --build` | Rebuild images before starting |
| `docker-compose down` | Stop and remove containers |
| `docker-compose logs` | View service logs |
| `docker-compose logs -f` | Follow logs (real-time) |
| `docker-compose ps` | List running services |
| `docker-compose exec flipper-app /bin/sh` | Execute shell in container |
| `docker-compose restart` | Restart services |

---

## Docker Run Commands Reference

| Command | Description |
|---------|-------------|
| `docker run -p 80:80 IMAGE` | Run container with port mapping |
| `docker run -d IMAGE` | Run in background (detached) |
| `docker run --name NAME IMAGE` | Run with custom container name |
| `docker run -v HOST_PATH:CONTAINER_PATH IMAGE` | Mount volume |
| `docker run -e VAR=VALUE IMAGE` | Set environment variables |
| `docker ps` | List running containers |
| `docker stop CONTAINER` | Stop container |
| `docker rm CONTAINER` | Remove container |
| `docker logs CONTAINER` | View container logs |
| `docker exec -it CONTAINER /bin/sh` | Access container shell |

---

## Dockerfile Explanation

The Dockerfile uses a **multi-stage build** approach:

### Stage 1: Builder
- Uses `node:18-alpine` as base image (lightweight)
- Installs all dependencies (production + development)
- Builds the Vite project (`npm run build`)
- Creates optimized `dist/` folder

### Stage 2: Runtime
- Uses a fresh `node:18-alpine` image
- Installs `http-server` globally
- Copies only the built `dist/` folder
- Exposes port 80
- Runs `http-server` to serve static files

**Benefits:**
- Smaller final image size (only production files)
- No build tools or dev dependencies in final image
- Faster startup
- Better security

---

## Docker Compose Features

- **Service Definition**: Defines `flipper-app` service
- **Build Context**: Builds from local Dockerfile
- **Port Mapping**: Maps `80:80`
- **Container Naming**: Auto-named `flipper-phaser-container`
- **Image Naming**: Creates `flipper-phaser:latest` image
- **Health Checks**: Verifies service is running
- **Restart Policy**: Auto-restarts on failure
- **Logging**: JSON file logging with rotation
- **Network**: Custom bridge network `flipper-network`

---

## Troubleshooting

### Port Already in Use

If port 80 is already in use:

```bash
# Using docker-compose (change port mapping)
# Edit docker-compose.yml and change ports to:
# ports:
#   - "8080:80"

# Using docker run
docker run -p 8080:80 flipper-phaser-container flipper-phaser:latest
```

### View Running Containers

```bash
docker ps
```

### View All Containers (including stopped)

```bash
docker ps -a
```

### Remove All Containers and Images

```bash
docker system prune -a
```

### Check Container Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker Run
docker logs CONTAINER_ID
```

### Access Container Shell

```bash
# Docker Compose
docker-compose exec flipper-app /bin/sh

# Docker Run
docker exec -it CONTAINER_ID /bin/sh
```

---

## Environment Variables

Set in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=80
```

To add more, edit the `environment:` section.

---

## Development vs Production

### Development (with hot reload)

```bash
# Uncomment volumes in docker-compose.yml:
volumes:
  - .:/app
  - /app/node_modules

# Then run:
docker-compose up
```

### Production (current setup)

- Optimized build
- Static files only
- No development dependencies
- Minimal image size
- Best performance

---

## Health Check

The container includes a health check that verifies the application is responding:

```bash
docker-compose ps
```

Status will show as `healthy` if working correctly.

---

## Building for Different Architectures

```bash
# Build for ARM64 (Apple Silicon, Raspberry Pi)
docker buildx build --platform linux/arm64 -t flipper-phaser:latest .

# Build for multiple architectures
docker buildx build --platform linux/amd64,linux/arm64 -t flipper-phaser:latest .
```

---

## Next Steps

1. Run: `docker-compose up --build`
2. Access: `http://localhost`
3. View logs: `docker-compose logs -f`
4. Modify services in `docker-compose.yml` as needed
5. Rebuild: `docker-compose up --build`

---

For more information, visit:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
