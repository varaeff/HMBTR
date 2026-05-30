#!/bin/sh
set -eu

echo "Applying database schema migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma

echo "Starting HMBTR backend..."
exec "$@"
