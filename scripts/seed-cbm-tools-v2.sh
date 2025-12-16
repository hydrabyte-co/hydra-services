#!/bin/bash

# ===================================
# CBM Tools Seeding Script v2
# ===================================
# Creates 29 API tools for CBM service integration
#
# Usage:
#   ADMIN_USERNAME=your@email.com ADMIN_PASSWORD=yourpass ./scripts/seed-cbm-tools-v2.sh
#
# Required: ADMIN_USERNAME, ADMIN_PASSWORD
# Optional: AIWM_BASE_URL, CBM_BASE_URL
# ===================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
AIWM_BASE_URL="${AIWM_BASE_URL:-https://api.x-or.cloud/dev/aiwm}"
CBM_BASE_URL="${CBM_BASE_URL:-https://api.x-or.cloud/dev/cbm}"

# Check credentials
if [ -z "$ADMIN_USERNAME" ] || [ -z "$ADMIN_PASSWORD" ]; then
  echo -e "${RED}✗ Error: ADMIN_USERNAME and ADMIN_PASSWORD required${NC}"
  echo "Usage: ADMIN_USERNAME=user@email.com ADMIN_PASSWORD=pass ./scripts/seed-cbm-tools-v2.sh"
  exit 1
fi

echo -e "${BLUE}===== CBM Tools Seeding Script v2 =====${NC}\n"

# Login
echo -e "${YELLOW}Authenticating...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST 'https://api.x-or.cloud/dev/iam-v2/auth/login' \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated${NC}\n"

# Helper function
create_tool() {
  local TOOL_DATA="$1"

  RESPONSE=$(curl -s -X POST "${AIWM_BASE_URL}/tools" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$TOOL_DATA")

  TOOL_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('_id', ''))" 2>/dev/null || echo "")

  if [ -z "$TOOL_ID" ]; then
    echo -e "${RED}✗ Failed${NC}"
    echo "$RESPONSE" | head -5
    return 1
  else
    TOOL_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
    echo -e "${GREEN}  ✓ $TOOL_NAME${NC}"
    return 0
  fi
}

# =================
# DOCUMENT TOOLS (6)
# =================
echo -e "${YELLOW}Creating Document Tools...${NC}"

create_tool "{
  \"name\": \"cbm_documents_findMany\",
  \"description\": \"List documents with pagination, filtering, and sorting\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"properties\": {
        \"page\": {\"type\": \"number\", \"default\": 1, \"minimum\": 1},
        \"limit\": {\"type\": \"number\", \"default\": 10, \"minimum\": 1, \"maximum\": 100},
        \"filter\": {\"type\": \"object\"},
        \"sort\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {
        \"data\": {\"type\": \"array\"},
        \"pagination\": {\"type\": \"object\"}
      }
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_documents_findById\",
  \"description\": \"Get a specific document by ID\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\", \"description\": \"Document ID\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}, \"summary\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_documents_getContent\",
  \"description\": \"Get document content with appropriate MIME type\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\", \"description\": \"Document ID\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"string\",
      \"description\": \"Document content as text\"
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents/{id}/content\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_documents_createOne\",
  \"description\": \"Create a new document\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"summary\", \"content\"],
      \"properties\": {
        \"summary\": {\"type\": \"string\", \"maxLength\": 500},
        \"content\": {\"type\": \"string\"},
        \"type\": {\"type\": \"string\", \"enum\": [\"html\", \"text\", \"markdown\", \"json\"]},
        \"tags\": {\"type\": \"array\", \"items\": {\"type\": \"string\"}},
        \"scope\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_documents_updateOne\",
  \"description\": \"Update an existing document\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\"},
        \"summary\": {\"type\": \"string\", \"maxLength\": 500},
        \"content\": {\"type\": \"string\"},
        \"type\": {\"type\": \"string\", \"enum\": [\"html\", \"text\", \"markdown\", \"json\"]},
        \"tags\": {\"type\": \"array\", \"items\": {\"type\": \"string\"}},
        \"scope\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"PATCH\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_documents_deleteOne\",
  \"description\": \"Soft delete a document\",
  \"type\": \"api\",
  \"category\": \"data\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\", \"description\": \"Document ID\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"message\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"DELETE\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/documents/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

echo ""

# ==============
# WORK TOOLS (13)
# ==============
echo -e "${YELLOW}Creating Work Tools...${NC}"

create_tool "{
  \"name\": \"cbm_works_findMany\",
  \"description\": \"List works with pagination, filtering, and sorting\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"properties\": {
        \"page\": {\"type\": \"number\", \"default\": 1},
        \"limit\": {\"type\": \"number\", \"default\": 10},
        \"filter\": {\"type\": \"object\"},
        \"sort\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"data\": {\"type\": \"array\"}, \"pagination\": {\"type\": \"object\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_findById\",
  \"description\": \"Get a specific work item by ID\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}, \"title\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_createOne\",
  \"description\": \"Create a new work item (epic, task, or subtask)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"title\", \"type\", \"reporter\"],
      \"properties\": {
        \"title\": {\"type\": \"string\", \"maxLength\": 200},
        \"type\": {\"type\": \"string\", \"enum\": [\"epic\", \"task\", \"subtask\"]},
        \"reporter\": {
          \"type\": \"object\",
          \"required\": [\"id\", \"type\"],
          \"properties\": {
            \"id\": {\"type\": \"string\"},
            \"type\": {\"type\": \"string\", \"enum\": [\"user\", \"agent\"]}
          }
        },
        \"description\": {\"type\": \"string\"},
        \"assignee\": {\"type\": \"object\"},
        \"status\": {\"type\": \"string\"},
        \"tags\": {\"type\": \"array\"},
        \"documents\": {\"type\": \"array\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_updateOne\",
  \"description\": \"Update a work item (type, status, reason are immutable)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\"},
        \"title\": {\"type\": \"string\"},
        \"description\": {\"type\": \"string\"},
        \"assignee\": {\"type\": \"object\"},
        \"tags\": {\"type\": \"array\"},
        \"documents\": {\"type\": \"array\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"PATCH\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_deleteOne\",
  \"description\": \"Delete a work item (only if status is done or cancelled)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"message\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"DELETE\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

# Work state transition tools
create_tool "{
  \"name\": \"cbm_works_start\",
  \"description\": \"Start a work item (backlog/todo → in_progress)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/start\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_block\",
  \"description\": \"Block a work item (in_progress → blocked, requires reason)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\", \"reason\"],
      \"properties\": {
        \"id\": {\"type\": \"string\"},
        \"reason\": {\"type\": \"string\", \"minLength\": 1, \"maxLength\": 1000}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}, \"reason\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/block\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_unblock\",
  \"description\": \"Unblock a work item (blocked → in_progress)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/unblock\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_requestReview\",
  \"description\": \"Request review (in_progress → review)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/request-review\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_complete\",
  \"description\": \"Complete a work item (review → done)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/complete\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_reopen\",
  \"description\": \"Reopen a work item (done → in_progress)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/reopen\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_cancel\",
  \"description\": \"Cancel a work item (any status → cancelled)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/cancel\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_works_canTrigger\",
  \"description\": \"Check if an agent can be triggered for this work item\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"canTrigger\": {\"type\": \"boolean\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/works/{id}/can-trigger\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

echo ""

# =================
# PROJECT TOOLS (10)
# =================
echo -e "${YELLOW}Creating Project Tools...${NC}"

create_tool "{
  \"name\": \"cbm_projects_findMany\",
  \"description\": \"List projects with pagination, filtering, and sorting\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"properties\": {
        \"page\": {\"type\": \"number\", \"default\": 1},
        \"limit\": {\"type\": \"number\", \"default\": 10},
        \"filter\": {\"type\": \"object\"},
        \"sort\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"data\": {\"type\": \"array\"}, \"pagination\": {\"type\": \"object\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_findById\",
  \"description\": \"Get a specific project by ID\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}, \"name\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"GET\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_createOne\",
  \"description\": \"Create a new project\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"name\"],
      \"properties\": {
        \"name\": {\"type\": \"string\", \"maxLength\": 200},
        \"description\": {\"type\": \"string\"},
        \"members\": {\"type\": \"array\"},
        \"startDate\": {\"type\": \"string\"},
        \"endDate\": {\"type\": \"string\"},
        \"tags\": {\"type\": \"array\"},
        \"documents\": {\"type\": \"array\"},
        \"status\": {\"type\": \"string\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_updateOne\",
  \"description\": \"Update an existing project\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {
        \"id\": {\"type\": \"string\"},
        \"name\": {\"type\": \"string\"},
        \"description\": {\"type\": \"string\"},
        \"members\": {\"type\": \"array\"},
        \"startDate\": {\"type\": \"string\"},
        \"endDate\": {\"type\": \"string\"},
        \"tags\": {\"type\": \"array\"},
        \"documents\": {\"type\": \"array\"}
      }
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"_id\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"PATCH\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_deleteOne\",
  \"description\": \"Delete a project (only if status is completed or archived)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"message\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"DELETE\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

# Project state transitions
create_tool "{
  \"name\": \"cbm_projects_activate\",
  \"description\": \"Activate a project (draft → active)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}/activate\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_hold\",
  \"description\": \"Put a project on hold (active → on_hold)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}/hold\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_resume\",
  \"description\": \"Resume a project from hold (on_hold → active)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}/resume\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_complete\",
  \"description\": \"Complete a project (active → completed)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}/complete\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

create_tool "{
  \"name\": \"cbm_projects_archive\",
  \"description\": \"Archive a completed project (completed → archived)\",
  \"type\": \"api\",
  \"category\": \"productivity\",
  \"status\": \"active\",
  \"scope\": \"org\",
  \"schema\": {
    \"inputSchema\": {
      \"type\": \"object\",
      \"required\": [\"id\"],
      \"properties\": {\"id\": {\"type\": \"string\"}}
    },
    \"outputSchema\": {
      \"type\": \"object\",
      \"properties\": {\"status\": {\"type\": \"string\"}}
    }
  },
  \"execution\": {
    \"method\": \"POST\",
    \"baseUrl\": \"$CBM_BASE_URL\",
    \"path\": \"/projects/{id}/archive\",
    \"headers\": {\"Content-Type\": \"application/json\"}
  }
}"

echo ""
echo -e "${GREEN}===== Seeding Complete! =====${NC}"
echo -e "${BLUE}Total tools created: 29${NC}"
echo -e "${BLUE}- Documents: 6 tools${NC}"
echo -e "${BLUE}- Works: 13 tools${NC}"
echo -e "${BLUE}- Projects: 10 tools${NC}"
