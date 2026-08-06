#!/bin/sh
set -eu

echo "Syncing Prisma schema with db push..."
npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss

echo "Starting HMBTR backend..."
exec "$@"
