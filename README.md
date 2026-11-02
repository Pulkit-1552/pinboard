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

## GitHub Actions

[`.github/workflows/ci_cd.yml`](.github/workflows/ci_cd.yml) runs on every push to `main`. It pushes three `linux/amd64` images to Docker Hub, then SSHs into EC2 and runs `docker compose pull` and `docker compose up -d`.

Repository secrets:

| Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `HOST` | EC2 public IP |
| `USERNAME` | `ubuntu` |
| `KEY` | Private SSH key, the whole file |
| `PORT` | `22` |

Postgres user, password, and database are fixed in `docker-compose.yml` as `pinboard`. They are not secrets. On the instance, Compose only needs `DOCKERHUB_USERNAME` and `IMAGE_TAG`. The workflow passes those over SSH.

Make the three Docker Hub repositories public so EC2 can pull them.

## EC2, once

Security group: SSH `22` open to the internet (GitHub Actions is not your home IP), HTTP `80` open, `5432` closed.

Install Docker and git. Put the matching public key in `/home/ubuntu/.ssh/authorized_keys`. After the first push to `main`, the workflow clones this repo to `~/pinboard` and starts it. Open `http://<ec2-public-ip>`.

## What each file is for

| File | Role |
|---|---|
| `frontend/` | React app. Its Dockerfile builds static files, then a small nginx serves only those files. |
| `backend/` | Express API. Creates the `notices` table on startup. SQL uses parameters (`$1`, `$2`). |
| `nginx/nginx.conf` | The routing you explain in a viva. `/api/` goes to `backend:3000`. `/` goes to `frontend:80`. |
| `docker-compose.yml` | Starts db, backend, frontend, and nginx together and wires the network. |
| `.github/workflows/ci_cd.yml` | Pushes the three images, then deploys them on EC2 over SSH. |
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
