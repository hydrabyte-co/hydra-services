#!/bin/bash

# ===================================
# CBM MCP Tools Seeding Script
# ===================================
# Executes the TypeScript seed script to populate CBM tools into database
# Reference: /docs/aiwm/CBM-MCP-TOOLS.md
#
# Creates 35 new API tools for CBM service integration:
# - 12 Document Management tools (6 CRUD + 4 Replace + 3 Append - GetDocumentContent already exists)
# - 10 Project Management tools (5 CRUD + 5 Workflow)
# - 13 Work Management tools (5 CRUD + 7 Workflow + 1 Special)
#
# Usage:
#   ./scripts/seed-cbm-tools.sh
#
# Optional Environment Variables:
#   MONGODB_URI - MongoDB connection string (default: mongodb://172.16.3.20:27017)
# ===================================

set -e  # Exit on error

echo "=== CBM MCP Tools Seeding Script ==="
echo ""

# Check if MongoDB URI is set
if [ -z "$MONGODB_URI" ]; then
  echo "⚠️  MONGODB_URI not set, using default: mongodb://172.16.3.20:27017"
  export MONGODB_URI="mongodb://172.16.3.20:27017"
fi

echo "MongoDB URI: $MONGODB_URI"
echo ""

# Run the TypeScript seed script with npx tsx
npx tsx scripts/seed-cbm-tools.ts

# Check exit code
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Seeding completed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Start MCP server: npx nx mcp aiwm"
  echo "2. Test with MCP Inspector or use: scripts/test-mcp-server.sh"
  echo ""
else
  echo ""
  echo "❌ Seeding failed! Check error messages above."
  exit 1
fi
