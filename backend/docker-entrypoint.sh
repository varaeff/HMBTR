#!/bin/sh
set -eu

echo "Applying database schema migrations..."
npx prisma db push --schema ./prisma/schema.prisma

echo "Starting HMBTR backend..."
exec "$@"
