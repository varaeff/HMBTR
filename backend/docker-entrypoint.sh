#!/bin/sh
set -eu

echo "Applying database schema migrations..."
npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss

echo "Starting HMBTR backend..."
exec "$@"
