# MCP Built-in Tools

This directory contains built-in MCP tools that integrate with various services in the Hydra ecosystem.

## Architecture

```
mcp/
├── builtin/                    # Built-in tools registry
│   ├── cbm/                   # CBM service tools
│   │   └── document-management/
│   │       ├── tools.ts       # Tool definitions
│   │       ├── schemas.ts     # Zod validation schemas
│   │       ├── executors.ts   # Execution logic
│   │       └── index.ts       # Exports
│   └── index.ts               # Built-in tools registry
├── types.ts                   # Common types
├── utils.ts                   # Helper functions
└── README.md                  # This file
```

## How It Works

1. **Tool Definition**: Each built-in tool is defined in `tools.ts` with:
   - Name (e.g., `cbm_document_create`)
   - Description
   - Type (`builtin`)
   - Category (e.g., `DocumentManagement`)
   - Input schema (Zod)
   - Executor function

2. **Schema Validation**: Zod schemas in `schemas.ts` validate tool inputs before execution

3. **Execution**: Executors in `executors.ts` make authenticated API calls to target services

4. **Registration**: Tools are registered in `bootstrap-mcp.ts` when an agent connects

## Available Built-in Tools

### DocumentManagement (CBM Service)

Tools for managing documents in the CBM service:

| Tool Name | Description |
|-----------|-------------|
| `CreateDocument` | Create a new document |
| `ListDocuments` | List documents with filters |
| `GetDocument` | Get document by ID |
| `GetDocumentContent` | Get document content |
| `UpdateDocument` | Update document metadata |
| `UpdateDocumentContent` | Update document content |
| `DeleteDocument` | Delete document |

## Enabling Built-in Tools for an Agent

To enable DocumentManagement tools for an agent:

1. **Create a DocumentManagement tool in AIWM**:
```bash
curl -X POST http://localhost:3003/tools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DocumentManagement",
    "description": "Built-in tool for managing documents",
    "type": "builtin",
    "status": "active"
  }'
```

2. **Get the tool ID from response** (e.g., `67abc123...`)

3. **Create or update agent with this tool**:
```bash
curl -X POST http://localhost:3003/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Agent",
    "status": "active",
    "allowedToolIds": ["67abc123..."]
  }'
```

4. **Generate agent JWT token**:
```bash
curl -X POST http://localhost:3003/agents/{agentId}/token \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expiresIn": 3600}'
```

5. **Connect to MCP server** with agent token:
```bash
curl -X POST http://localhost:3306 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

## Adding New Built-in Tools

### 1. Create Tool Module Structure

```bash
mkdir -p services/aiwm/src/mcp/builtin/cbm/my-new-tool
```

### 2. Define Schemas (`schemas.ts`)

```typescript
import * as z from 'zod';

export const MyOperationSchema = z.object({
  field1: z.string().describe('Description'),
  field2: z.number().optional().describe('Optional field'),
});
```

### 3. Implement Executors (`executors.ts`)

```typescript
import { ExecutionContext, ToolResponse } from '../../../types';
import { makeServiceRequest, formatToolResponse } from '../../../utils';

export async function executeMyOperation(
  args: { field1: string; field2?: number },
  context: ExecutionContext
): Promise<ToolResponse> {
  const response = await makeServiceRequest(
    `${getServiceBaseUrl('cbm')}/my-endpoint`,
    {
      method: 'POST',
      context,
      body: JSON.stringify(args),
    }
  );
  return formatToolResponse(response);
}
```

### 4. Define Tools (`tools.ts`)

```typescript
import { ToolDefinition } from '../../../types';
import { executeMyOperation } from './executors';
import { MyOperationSchema } from './schemas';

export const MyNewTools: ToolDefinition[] = [
  {
    name: 'MyOperation',  // PascalCase for clean naming
    description: 'Performs my operation',
    type: 'builtin',
    category: 'MyNewTool',
    executor: executeMyOperation,
    inputSchema: MyOperationSchema,
  },
];
```

### 5. Export and Register

Add to `services/aiwm/src/mcp/builtin/index.ts`:

```typescript
import { MyNewTools } from './cbm/my-new-tool';

export const BuiltInTools: ToolDefinition[] = [
  ...DocumentManagementTools,
  ...MyNewTools, // Add here
];
```

## Testing

Use the test script to verify built-in tools:

```bash
./scripts/test-document-management-mcp.sh
```

Or test manually with MCP Inspector:
1. Start MCP Inspector
2. Use Direct Mode with URL: `http://localhost:3306`
3. Add Authorization header with agent token
4. Call `tools/list` to see available tools
5. Call specific tools to test execution

## Environment Variables

Built-in tools use these environment variables for service URLs:

- `CBM_SERVICE_URL` (default: `http://localhost:3001`)
- `IAM_SERVICE_URL` (default: `http://localhost:3000`)
- `AIWM_SERVICE_URL` (default: `http://localhost:3003`)

## Security

- All built-in tools require JWT authentication
- Token is passed from agent connection to service calls
- Execution context includes: `userId`, `orgId`, `agentId`, `groupId`, `roles`
- RBAC is enforced at the service level (CBM, IAM, etc.)

## Future Enhancements

Planned built-in tools:

- **ProjectManagement** - Project CRUD operations
- **WorkManagement** - Work item management
- **IAM** - User and organization management
- **AIWM** - Model, agent, deployment management
