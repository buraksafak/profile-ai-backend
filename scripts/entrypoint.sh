#!/bin/sh
set -eu

PRISMA="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA" ]; then
  echo "[entrypoint] Prisma CLI not found at $PRISMA" >&2
  exit 1
fi

echo "[entrypoint] generating Prisma client..."
"$PRISMA" generate

echo "[entrypoint] applying database migrations..."
"$PRISMA" migrate deploy

echo "[entrypoint] starting application: $*"
exec "$@"
