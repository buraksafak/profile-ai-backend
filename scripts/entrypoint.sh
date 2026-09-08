#!/bin/sh
set -e

PRISMA="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA" ]; then
  PRISMA="npx prisma"
fi

echo "[entrypoint] generating Prisma client..."
$PRISMA generate

echo "[entrypoint] applying database migrations..."
$PRISMA migrate deploy

echo "[entrypoint] starting application: $*"
exec "$@"
