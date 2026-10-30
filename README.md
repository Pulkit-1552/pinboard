# Pinboard

A small notice board with a React frontend, an Express API, and Postgres. Nginx is the only public entry. One URL serves the page and the API.

```
Browser  →  nginx:80
              ├── /api/...   →  backend:3000  →  postgres
              └── everything else  →  frontend:80 (static React build)
```

Postgres is the official image. You build and push three images of your own: `pinboard-frontend`, `pinboard-backend`, and `pinboard-nginx`.

## Run on your laptop

Docker Desktop (or Docker Engine plus the Compose plugin) is enough.

```bash
docker compose up --build
```

Open http://localhost . The first start takes a few minutes because images are built. Notices survive a restart because Postgres data lives in the `pgdata` volume.

Stop it with Ctrl+C, then `docker compose down`. Add `-v` only when you want to delete the saved notices.

API checks:

```bash
curl http://localhost/api/health
curl http://localhost/api/notices
curl -X POST http://localhost/api/notices \
  -H 'Content-Type: application/json' \
  -d '{"title":"OS lab moved","body":"Room 204 today."}'
```

Backend unit tests, no database needed:

```bash
cd backend && npm test
```

## GitHub Actions → Docker Hub

The workflow [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml) runs on every push to `main`. It builds `linux/amd64` images (what a normal EC2 instance runs) and pushes:

- `<dockerhub-username>/pinboard-frontend:latest`
- `<dockerhub-username>/pinboard-backend:latest`
- `<dockerhub-username>/pinboard-nginx:latest`

Each image is also tagged with the git commit SHA.

1. Create a Docker Hub access token: Account Settings → Personal access tokens. Do not use your account password.
2. On the GitHub repo: Settings → Secrets and variables → Actions → New repository secret.
   - `DOCKERHUB_USERNAME` — your Docker Hub username
   - `DOCKERHUB_TOKEN` — the access token
3. Push this project to GitHub on branch `main`. The Actions tab should show three green jobs.
4. On Docker Hub, set the three repositories to Public so the EC2 instance can pull them without storing the token.

## Run on AWS

1. Launch an Ubuntu EC2 instance. In the security group allow:
   - SSH `22` from your IP
   - HTTP `80` from anywhere
   - Do not open `5432`. Postgres stays on the private Docker network.
2. Install Docker Engine and the Compose plugin from Docker's Ubuntu packages, then re-login so the `docker` group applies.
3. Clone this repo on the instance. Copy the env file and edit it:

```bash
cp .env.example .env
```

Set `DOCKERHUB_USERNAME` to your Docker Hub username, `IMAGE_TAG=latest`, and a real `POSTGRES_PASSWORD`.

4. Start from the published images:

```bash
docker compose pull
docker compose up -d
```

5. Open `http://<ec2-public-ip>`.

`docker compose pull` downloads the three images GitHub built. `up -d` starts them plus the official Postgres image. Nginx in the `pinboard-nginx` image is already configured. You do not install nginx on the Ubuntu host unless port 80 on the host is already taken.

Update after a new push to `main`:

```bash
git pull
docker compose pull
docker compose up -d
```

## What each file is for

| File | Role |
|---|---|
| `frontend/` | React app. Its Dockerfile builds static files, then a small nginx serves only those files. |
| `backend/` | Express API. Creates the `notices` table on startup. SQL uses parameters (`$1`, `$2`). |
| `nginx/nginx.conf` | The routing you explain in a viva. `/api/` goes to `backend:3000`. `/` goes to `frontend:80`. |
| `docker-compose.yml` | Starts db, backend, frontend, and nginx together and wires the network. |
| `.github/workflows/docker-publish.yml` | Builds the three images on GitHub and pushes them to Docker Hub. |
| `openapi.yaml` | Contract for the API. |

Only the edge nginx publishes a host port. Frontend, backend, and Postgres are reachable from other containers, not from the public internet.

## API

| Method | Path | Result |
|---|---|---|
| `GET` | `/api/health` | `{ "ok": true }` |
| `GET` | `/api/notices` | Newest notices first |
| `POST` | `/api/notices` | Body `{ "title", "body" }`. Title ≤ 80 chars, message ≤ 500. |
| `DELETE` | `/api/notices/:id` | `204` when removed, `404` when missing |

Full shapes are in `openapi.yaml`.
