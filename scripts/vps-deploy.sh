#!/usr/bin/env bash
# Ubuntu VPS production deploy for profile-ai.
#
# First run on a fresh Ubuntu server:
#   chmod +x scripts/vps-deploy.sh
#   ./scripts/vps-deploy.sh --install-docker
#   cp .env.example .env && nano .env
#   ./scripts/vps-deploy.sh
#
# Optional nginx reverse proxy on port 80:
#   ./scripts/vps-deploy.sh --proxy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE_FILE="docker-compose.prod.yml"
INSTALL_DOCKER=0
USE_PROXY=0
FOLLOW_LOGS=0

usage() {
  cat <<'EOF'
Usage: ./scripts/vps-deploy.sh [options]

Options:
  --install-docker  Install Docker Engine + Compose plugin (Ubuntu)
  --proxy           Start nginx reverse proxy on port 80
  --logs            Follow container logs after a successful start
  -h, --help        Show this help
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --install-docker) INSTALL_DOCKER=1 ;;
    --proxy) USE_PROXY=1 ;;
    --logs) FOLLOW_LOGS=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
  shift
done

run_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    echo "This step needs root privileges: $*" >&2
    exit 1
  fi
}

install_docker_ubuntu() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "[deploy] Docker and Compose are already installed"
    return
  fi

  if [ ! -f /etc/os-release ] || ! grep -qi '^ID=ubuntu' /etc/os-release; then
    echo "[deploy] Docker is missing and this is not Ubuntu. Install Docker Engine first." >&2
    exit 1
  fi

  echo "[deploy] Installing Docker Engine and Compose plugin..."
  run_root apt-get update
  run_root apt-get install -y ca-certificates curl gnupg
  run_root install -m 0755 -d /etc/apt/keyrings

  if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | run_root gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    run_root chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    | run_root tee /etc/apt/sources.list.d/docker.list >/dev/null

  run_root apt-get update
  run_root apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  run_root systemctl enable --now docker

  if [ "$(id -u)" -ne 0 ]; then
    run_root usermod -aG docker "$USER"
    echo "[deploy] User $USER added to the docker group. Log out and back in if docker still needs sudo."
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[deploy] Docker is not installed. Re-run with --install-docker on Ubuntu." >&2
    exit 1
  fi

  if ! docker compose version >/dev/null 2>&1; then
    echo "[deploy] Docker Compose plugin is missing. Re-run with --install-docker on Ubuntu." >&2
    exit 1
  fi
}

ensure_env_file() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "[deploy] Created .env from .env.example. Fill in secrets before deploying." >&2
    exit 1
  fi
}

env_value() {
  local key="$1"
  grep -E "^${key}=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//; s/["'\'']$//'
}

validate_env() {
  local missing=0
  local key value

  for key in DATABASE_URL POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB GEMINI_API_KEY CORS_ORIGIN API_SECRET_KEY; do
    value="$(env_value "$key")"
    if [ -z "$value" ]; then
      echo "[deploy] Missing $key in .env" >&2
      missing=1
    fi
  done

  local gemini api_key db_url
  gemini="$(env_value GEMINI_API_KEY)"
  api_key="$(env_value API_SECRET_KEY)"
  db_url="$(env_value DATABASE_URL)"

  case "$gemini" in
    ""|your-gemini-api-key) echo "[deploy] GEMINI_API_KEY still has a placeholder value" >&2; missing=1 ;;
  esac

  case "$api_key" in
    ""|change-me-to-a-long-random-secret|CHANGE_ME_LONG_RANDOM_SECRET)
      echo "[deploy] API_SECRET_KEY still has a placeholder value" >&2
      missing=1
      ;;
  esac

  if [ -n "$db_url" ] && ! printf '%s' "$db_url" | grep -q '@db:'; then
    echo "[deploy] DATABASE_URL should use Docker hostname 'db' (example: postgresql://user:pass@db:5432/profile_ai?schema=public)" >&2
    missing=1
  fi

  if [ "$missing" -ne 0 ]; then
    exit 1
  fi
}

compose() {
  local extra=()
  if [ "$USE_PROXY" -eq 1 ]; then
    extra=(--profile proxy)
  fi
  docker compose -f "$COMPOSE_FILE" "${extra[@]}" "$@"
}

if [ "$INSTALL_DOCKER" -eq 1 ]; then
  install_docker_ubuntu
fi

require_docker
ensure_env_file
validate_env

echo "[deploy] Building and starting production stack..."
compose up -d --build --remove-orphans
compose ps

echo "[deploy] Waiting for app health..."
attempts=0
until [ "$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' profile-ai-app 2>/dev/null)" = "healthy" ]; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 40 ]; then
    echo "[deploy] App did not become healthy in time. Recent logs:" >&2
    compose logs --tail=80 app
    exit 1
  fi
  sleep 3
done

port="$(env_value PORT)"
port="${port:-3000}"
nginx_port="$(env_value NGINX_HTTP_PORT)"
nginx_port="${nginx_port:-80}"
echo "[deploy] App is healthy on port ${port}"
echo "[deploy] Health check: curl -fsS http://127.0.0.1:${port}/api/v1/health"

if [ "$USE_PROXY" -eq 1 ]; then
  echo "[deploy] Nginx proxy listening on port ${nginx_port}"
fi

if [ "$FOLLOW_LOGS" -eq 1 ]; then
  compose logs -f --tail=100
fi
