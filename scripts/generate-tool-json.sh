#!/bin/bash
# Helper to generate properly formatted tool JSON

generate_tool() {
  local name=$1
  local description=$2
  local category=$3
  local method=$4
  local path=$5
  local input_schema=$6
  local output_schema=${7:-'{"type":"object","properties":{"success":{"type":"boolean"},"data":{"type":"object"}}}'}

  cat <<EOF
{
  "name": "$name",
  "description": "$description",
  "type": "api",
  "category": "$category",
  "status": "active",
  "scope": "org",
  "schema": {
    "inputSchema": $input_schema,
    "outputSchema": $output_schema
  },
  "execution": {
    "method": "$method",
    "baseUrl": "\${CBM_BASE_URL}",
    "path": "$path",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}
EOF
}

# Example: Document findMany
generate_tool \
  "cbm_documents_findMany" \
  "List documents with pagination, filtering, and sorting options" \
  "data" \
  "GET" \
  "/documents" \
  '{"type":"object","properties":{"page":{"type":"number","default":1},"limit":{"type":"number","default":10},"filter":{"type":"object"},"sort":{"type":"string"}}}' \
  '{"type":"object","properties":{"data":{"type":"array"},"pagination":{"type":"object"}}}'
