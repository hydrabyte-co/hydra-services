#!/bin/bash

# Seed Example Models Script
# Usage: ./scripts/seed-models.sh

MONGO_HOST="${MONGO_HOST:-172.16.3.20}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-core_aiwm}"
MONGO_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}"

echo "========================================="
echo "Seeding Example Models"
echo "========================================="
echo "MongoDB URI: ${MONGO_URI}"
echo ""

# Check if mongosh is installed
if ! command -v mongosh &> /dev/null; then
    echo "❌ Error: mongosh is not installed"
    echo "Please install MongoDB Shell: https://www.mongodb.com/try/download/shell"
    exit 1
fi

# Test connection
echo "Testing connection..."
if ! mongosh "${MONGO_URI}" --quiet --eval "db.version()" &> /dev/null; then
    echo "❌ Error: Cannot connect to MongoDB at ${MONGO_URI}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if MongoDB is running: systemctl status mongod"
    echo "  2. Check network connectivity: ping ${MONGO_HOST}"
    echo "  3. Check firewall rules: sudo ufw status"
    echo "  4. Verify MongoDB bind address in /etc/mongod.conf"
    echo ""
    echo "If MongoDB is on a remote server, you may need to:"
    echo "  - SSH tunnel: ssh -L 27017:${MONGO_HOST}:27017 user@server"
    echo "  - Then run: MONGO_HOST=localhost ./scripts/seed-models.sh"
    exit 1
fi

echo "✅ Connection successful"
echo ""

# Run seed script
echo "Running seed script..."
mongosh "${MONGO_URI}" --quiet < "$(dirname "$0")/seed-example-models.js"

exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Seeding completed successfully!"
    echo "========================================="
else
    echo ""
    echo "========================================="
    echo "❌ Seeding failed with exit code: $exit_code"
    echo "========================================="
fi

exit $exit_code
