#!/bin/bash

# ===================================
# CBM Tools Seeding Script
# ===================================
# Creates 29 API tools for CBM service integration:
# - 6 Document Management tools
# - 13 Work Management tools
# - 10 Project Management tools
#
# Usage: ./scripts/seed-cbm-tools.sh
# ===================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AIWM_BASE_URL="${AIWM_BASE_URL:-https://api.x-or.cloud/dev/aiwm}"
CBM_BASE_URL="${CBM_BASE_URL:-https://api.x-or.cloud/dev/cbm}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}CBM Tools Seeding Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ===================================
# Step 1: Login and Get Token
# ===================================
echo -e "${YELLOW}Step 1: Authenticating...${NC}"

# Login
LOGIN_RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "admin@x-or.cloud",
    "password": "NewPass123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get authentication token${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}"
echo ""

# ===================================
# Helper Function: Create Tool
# ===================================
create_tool() {
  local TOOL_DATA="$1"

  RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/tools" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$TOOL_DATA")

  # Check if successful
  TOOL_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('_id', ''))" 2>/dev/null || echo "")

  if [ -z "$TOOL_ID" ]; then
    echo -e "${RED}✗ Failed to create tool${NC}"
    echo "$RESPONSE"
    return 1
  else
    TOOL_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
    echo -e "${GREEN}  ✓ Created: $TOOL_NAME${NC}"
    return 0
  fi
}

# ===================================
# Step 2: Create Document Management Tools (6 tools)
# ===================================
echo -e "${YELLOW}Step 2: Creating Document Management Tools...${NC}"

# Tool 1: cbm_documents_findMany
create_tool '{
  "name": "cbm_documents_findMany",
  "description": "List documents with pagination, filtering, and sorting options",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "list", "query"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "description": "Page number for pagination (default: 1)",
        "default": 1,
        "minimum": 1
      },
      "limit": {
        "type": "number",
        "description": "Number of items per page (default: 10, max: 100)",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      },
      "filter": {
        "type": "object",
        "description": "Filter criteria (e.g., {\"status\": \"published\"})"
      },
      "sort": {
        "type": "string",
        "description": "Sort field and direction (e.g., \"-createdAt\" for descending)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 2: cbm_documents_findById
create_tool '{
  "name": "cbm_documents_findById",
  "description": "Get a specific document by its ID",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "read"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Document ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents/{id}",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 3: cbm_documents_getContent
create_tool '{
  "name": "cbm_documents_getContent",
  "description": "Get document content with appropriate MIME type (HTML, markdown, text, JSON)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "content", "read"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Document ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents/{id}/content",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 4: cbm_documents_createOne
create_tool '{
  "name": "cbm_documents_createOne",
  "description": "Create a new document with summary, content, type, and optional metadata",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "create"],
  "inputSchema": {
    "type": "object",
    "required": ["summary", "content"],
    "properties": {
      "summary": {
        "type": "string",
        "maxLength": 500,
        "description": "Brief summary of the document (max 500 characters)"
      },
      "content": {
        "type": "string",
        "description": "Main content of the document"
      },
      "type": {
        "type": "string",
        "enum": ["html", "text", "markdown", "json"],
        "description": "Content type format (html, text, markdown, json)"
      },
      "labels": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Optional labels for categorization"
      },
      "status": {
        "type": "string",
        "description": "Document status"
      },
      "scope": {
        "type": "string",
        "description": "Access scope for the document"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 5: cbm_documents_updateOne
create_tool '{
  "name": "cbm_documents_updateOne",
  "description": "Update an existing document (all fields optional)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "update"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Document ID (MongoDB ObjectId)"
      },
      "summary": {
        "type": "string",
        "maxLength": 500,
        "description": "Brief summary of the document (max 500 characters)"
      },
      "content": {
        "type": "string",
        "description": "Main content of the document"
      },
      "type": {
        "type": "string",
        "enum": ["html", "text", "markdown", "json"],
        "description": "Content type format"
      },
      "labels": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Labels for categorization"
      },
      "status": {
        "type": "string",
        "description": "Document status"
      },
      "scope": {
        "type": "string",
        "description": "Access scope for the document"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents/{id}",
    "method": "PATCH",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 6: cbm_documents_deleteOne
create_tool '{
  "name": "cbm_documents_deleteOne",
  "description": "Soft delete a document by ID",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "document", "delete"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Document ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/documents/{id}",
    "method": "DELETE",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

echo ""

# ===================================
# Step 3: Create Work Management Tools (13 tools)
# ===================================
echo -e "${YELLOW}Step 3: Creating Work Management Tools...${NC}"

# Tool 7: cbm_works_findMany
create_tool '{
  "name": "cbm_works_findMany",
  "description": "List works with pagination, filtering, and sorting options",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "list", "query"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "description": "Page number for pagination (default: 1)",
        "default": 1,
        "minimum": 1
      },
      "limit": {
        "type": "number",
        "description": "Number of items per page (default: 10, max: 100)",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      },
      "filter": {
        "type": "object",
        "description": "Filter criteria (e.g., {\"status\": \"in_progress\", \"type\": \"task\"})"
      },
      "sort": {
        "type": "string",
        "description": "Sort field and direction (e.g., \"-createdAt\")"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 8: cbm_works_findById
create_tool '{
  "name": "cbm_works_findById",
  "description": "Get a specific work item by its ID",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "read"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 9: cbm_works_createOne
create_tool '{
  "name": "cbm_works_createOne",
  "description": "Create a new work item (epic, task, or subtask) with required title, type, and reporter",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "create"],
  "inputSchema": {
    "type": "object",
    "required": ["title", "type", "reporter"],
    "properties": {
      "title": {
        "type": "string",
        "maxLength": 200,
        "description": "Work title (max 200 characters)"
      },
      "type": {
        "type": "string",
        "enum": ["epic", "task", "subtask"],
        "description": "Work type (immutable after creation): epic, task, or subtask"
      },
      "reporter": {
        "type": "object",
        "required": ["type", "id"],
        "properties": {
          "type": {
            "type": "string",
            "enum": ["agent", "user"],
            "description": "Reporter type: agent or user"
          },
          "id": {
            "type": "string",
            "description": "Reporter ID (agent or user ObjectId)"
          }
        },
        "description": "Reporter information (agent or user who created this work)"
      },
      "description": {
        "type": "string",
        "description": "Detailed description of the work"
      },
      "projectId": {
        "type": "string",
        "description": "Project ID this work belongs to"
      },
      "assignee": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["agent", "user"]
          },
          "id": {
            "type": "string"
          }
        },
        "description": "Assignee (agent or user assigned to this work)"
      },
      "dueDate": {
        "type": "string",
        "format": "date-time",
        "description": "Due date (ISO 8601 format)"
      },
      "startAt": {
        "type": "string",
        "format": "date-time",
        "description": "Planned start date (ISO 8601 format)"
      },
      "status": {
        "type": "string",
        "description": "Initial status"
      },
      "dependencies": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of work IDs this work depends on"
      },
      "parentId": {
        "type": "string",
        "description": "Parent work ID (for subtasks)"
      },
      "documents": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of document IDs attached to this work"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 10: cbm_works_updateOne
create_tool '{
  "name": "cbm_works_updateOne",
  "description": "Update a work item (note: type, status, and reason are immutable)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "update"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      },
      "title": {
        "type": "string",
        "maxLength": 200,
        "description": "Work title"
      },
      "description": {
        "type": "string",
        "description": "Detailed description"
      },
      "projectId": {
        "type": "string",
        "description": "Project ID"
      },
      "assignee": {
        "type": "object",
        "properties": {
          "type": { "type": "string", "enum": ["agent", "user"] },
          "id": { "type": "string" }
        }
      },
      "dueDate": {
        "type": "string",
        "format": "date-time"
      },
      "startAt": {
        "type": "string",
        "format": "date-time"
      },
      "dependencies": {
        "type": "array",
        "items": { "type": "string" }
      },
      "documents": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}",
    "method": "PATCH",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 11: cbm_works_deleteOne
create_tool '{
  "name": "cbm_works_deleteOne",
  "description": "Delete a work item (only allowed if status is done or cancelled)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "delete"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}",
    "method": "DELETE",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 12: cbm_works_start
create_tool '{
  "name": "cbm_works_start",
  "description": "Start a work item (transition from backlog/todo to in_progress)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/start",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 13: cbm_works_block
create_tool '{
  "name": "cbm_works_block",
  "description": "Block a work item (transition from in_progress to blocked, requires reason)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id", "reason"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      },
      "reason": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000,
        "description": "Reason for blocking (1-1000 characters)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/block",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 14: cbm_works_unblock
create_tool '{
  "name": "cbm_works_unblock",
  "description": "Unblock a work item (transition from blocked to in_progress)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/unblock",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 15: cbm_works_requestReview
create_tool '{
  "name": "cbm_works_requestReview",
  "description": "Request review for a work item (transition from in_progress to review)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/request-review",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 16: cbm_works_complete
create_tool '{
  "name": "cbm_works_complete",
  "description": "Complete a work item (transition from review to done)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/complete",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 17: cbm_works_reopen
create_tool '{
  "name": "cbm_works_reopen",
  "description": "Reopen a completed work item (transition from done to in_progress)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/reopen",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 18: cbm_works_cancel
create_tool '{
  "name": "cbm_works_cancel",
  "description": "Cancel a work item (transition from any status to cancelled)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/cancel",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 19: cbm_works_canTrigger
create_tool '{
  "name": "cbm_works_canTrigger",
  "description": "Check if an agent can be triggered for this work item",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "work", "query", "agent"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Work ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/works/{id}/can-trigger",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

echo ""

# ===================================
# Step 4: Create Project Management Tools (10 tools)
# ===================================
echo -e "${YELLOW}Step 4: Creating Project Management Tools...${NC}"

# Tool 20: cbm_projects_findMany
create_tool '{
  "name": "cbm_projects_findMany",
  "description": "List projects with pagination, filtering, and sorting options",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "list", "query"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "page": {
        "type": "number",
        "description": "Page number for pagination (default: 1)",
        "default": 1,
        "minimum": 1
      },
      "limit": {
        "type": "number",
        "description": "Number of items per page (default: 10, max: 100)",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      },
      "filter": {
        "type": "object",
        "description": "Filter criteria (e.g., {\"status\": \"active\"})"
      },
      "sort": {
        "type": "string",
        "description": "Sort field and direction (e.g., \"-createdAt\")"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 21: cbm_projects_findById
create_tool '{
  "name": "cbm_projects_findById",
  "description": "Get a specific project by its ID",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "read"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}",
    "method": "GET",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 22: cbm_projects_createOne
create_tool '{
  "name": "cbm_projects_createOne",
  "description": "Create a new project with name, description, members, and optional metadata",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "create"],
  "inputSchema": {
    "type": "object",
    "required": ["name"],
    "properties": {
      "name": {
        "type": "string",
        "maxLength": 200,
        "description": "Project name (max 200 characters)"
      },
      "description": {
        "type": "string",
        "description": "Project description"
      },
      "members": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of user IDs who are project members"
      },
      "startDate": {
        "type": "string",
        "format": "date-time",
        "description": "Project start date (ISO 8601 format)"
      },
      "dueDate": {
        "type": "string",
        "format": "date-time",
        "description": "Project due date (ISO 8601 format)"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Project tags for categorization"
      },
      "documents": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of document IDs attached to this project"
      },
      "status": {
        "type": "string",
        "description": "Initial project status"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 23: cbm_projects_updateOne
create_tool '{
  "name": "cbm_projects_updateOne",
  "description": "Update an existing project (all fields optional)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "update"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      },
      "name": {
        "type": "string",
        "maxLength": 200,
        "description": "Project name"
      },
      "description": {
        "type": "string",
        "description": "Project description"
      },
      "members": {
        "type": "array",
        "items": { "type": "string" }
      },
      "startDate": {
        "type": "string",
        "format": "date-time"
      },
      "dueDate": {
        "type": "string",
        "format": "date-time"
      },
      "tags": {
        "type": "array",
        "items": { "type": "string" }
      },
      "documents": {
        "type": "array",
        "items": { "type": "string" }
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}",
    "method": "PATCH",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 24: cbm_projects_deleteOne
create_tool '{
  "name": "cbm_projects_deleteOne",
  "description": "Delete a project (only allowed if status is completed or archived)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "delete"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}",
    "method": "DELETE",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 25: cbm_projects_activate
create_tool '{
  "name": "cbm_projects_activate",
  "description": "Activate a project (transition from draft to active)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}/activate",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 26: cbm_projects_hold
create_tool '{
  "name": "cbm_projects_hold",
  "description": "Put a project on hold (transition from active to on_hold)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}/hold",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 27: cbm_projects_resume
create_tool '{
  "name": "cbm_projects_resume",
  "description": "Resume a project from hold (transition from on_hold to active)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}/resume",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 28: cbm_projects_complete
create_tool '{
  "name": "cbm_projects_complete",
  "description": "Complete a project (transition from active to completed)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}/complete",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

# Tool 29: cbm_projects_archive
create_tool '{
  "name": "cbm_projects_archive",
  "description": "Archive a completed project (transition from completed to archived)",
  "type": "api",
  "status": "active",
  "tags": ["cbm", "project", "action", "state-transition"],
  "inputSchema": {
    "type": "object",
    "required": ["id"],
    "properties": {
      "id": {
        "type": "string",
        "description": "Project ID (MongoDB ObjectId)"
      }
    }
  },
  "execution": {
    "type": "http",
    "baseUrl": "'"$CBM_BASE_URL"'",
    "path": "/projects/{id}/archive",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    }
  }
}'

echo ""

# ===================================
# Step 5: Verify Tools Created
# ===================================
echo -e "${YELLOW}Step 5: Verifying tools created...${NC}"

TOOL_COUNT=$(curl -s -X GET "${AIWM_BASE_URL}/tools?filter[tags]=cbm&limit=100" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']))" 2>/dev/null || echo "0")

echo -e "${GREEN}✓ Total CBM tools created: $TOOL_COUNT${NC}"
echo ""

# ===================================
# Summary
# ===================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Seeding Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "Summary:"
echo -e "  ${GREEN}✓${NC} Document Management: 6 tools"
echo -e "  ${GREEN}✓${NC} Work Management: 13 tools"
echo -e "  ${GREEN}✓${NC} Project Management: 10 tools"
echo -e "  ${GREEN}✓${NC} Total: 29 CBM API tools"
echo ""
echo -e "Next steps:"
echo -e "  1. Verify tools: ${BLUE}curl -X GET '${AIWM_BASE_URL}/tools?filter[tags]=cbm' -H 'Authorization: Bearer \$TOKEN'${NC}"
echo -e "  2. Assign tools to agents via allowedToolIds"
echo -e "  3. Agents will discover these tools via MCP endpoint"
echo ""
