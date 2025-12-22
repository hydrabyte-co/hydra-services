# MCP Inspector Quick Start Guide

## 🚀 Quick Setup (One Command)

```bash
# Run this to setup everything and get agent token
./scripts/setup-documentmanagement-tool.sh
```

This will output an **Agent Token** - copy it for MCP Inspector!

---

## 📋 Step-by-Step Instructions

### 1. Start Services

Make sure all services are running:

```bash
# Terminal 1: IAM (port 3000)
npx nx serve iam

# Terminal 2: CBM (port 3001)
npx nx serve cbm

# Terminal 3: AIWM (port 3003)
npx nx serve aiwm

# Terminal 4: MCP Server (port 3306)
npx nx mcp aiwm
```

### 2. Get Agent Token

Run the setup script:

```bash
./scripts/setup-documentmanagement-tool.sh
```

**Copy the Agent Token** from output (looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Open MCP Inspector

```bash
# Option 1: Use npx (recommended)
npx @modelcontextprotocol/inspector

# Option 2: Install globally first
npm install -g @modelcontextprotocol/inspector
mcp-inspector
```

Browser will open automatically at `http://localhost:6274`

### 4. Configure MCP Inspector

1. **Select "Direct Mode"**
2. **Enter URL**: `http://localhost:3306`
3. **Add Header**:
   - Click "+ Add Header"
   - Key: `Authorization`
   - Value: `Bearer <paste-agent-token-here>`
4. **Click "Connect"**

### 5. Test Tools

Once connected, you should see **7 DocumentManagement tools**:

- `CreateDocument`
- `ListDocuments`
- `GetDocument`
- `GetDocumentContent`
- `UpdateDocument`
- `UpdateDocumentContent`
- `DeleteDocument`

---

## 🧪 Example Test Scenarios

### Test 1: Create a Document

**Tool**: `CreateDocument`

**Arguments**:
```json
{
  "summary": "My First Test Document",
  "content": "This is a test document created via MCP Inspector",
  "type": "markdown",
  "labels": ["test", "mcp"],
  "status": "draft"
}
```

**Expected Response**: Document created with ID

---

### Test 2: List Documents

**Tool**: `ListDocuments`

**Arguments**:
```json
{
  "page": 1,
  "limit": 10,
  "search": "test"
}
```

**Expected Response**: List of documents matching search

---

### Test 3: Get Document

**Tool**: `GetDocument`

**Arguments**:
```json
{
  "id": "<document-id-from-create>"
}
```

**Expected Response**: Full document details

---

### Test 4: Update Document Content

**Tool**: `UpdateDocumentContent`

**Arguments**:
```json
{
  "id": "<document-id>",
  "operation": "append",
  "content": "\n\n## New Section\n\nAppended via MCP!"
}
```

**Expected Response**: Updated document

---

### Test 5: Delete Document

**Tool**: `DeleteDocument`

**Arguments**:
```json
{
  "id": "<document-id>"
}
```

**Expected Response**: Soft delete confirmation

---

## 🐛 Troubleshooting

### Issue: "Connection failed" or "401 Unauthorized"

**Solutions**:
1. Check agent token is valid (not expired)
2. Verify token format: `Bearer eyJhbG...` (with space after "Bearer")
3. Re-run setup script to get fresh token
4. Check MCP server is running on port 3306

### Issue: "No tools available"

**Solutions**:
1. Check AIWM service is running
2. Verify DocumentManagement tool was created with `type: "builtin"`
3. Check agent's `allowedToolIds` includes the tool
4. Check MCP server logs for errors

### Issue: "Tool execution failed"

**Solutions**:
1. Check CBM service is running on port 3001
2. Verify agent has permissions (RBAC)
3. Check service logs for details:
   ```bash
   # Check MCP server logs
   # (look at terminal running: npx nx mcp aiwm)

   # Check CBM service logs
   # (look at terminal running: npx nx serve cbm)
   ```

### Issue: "Invalid arguments"

**Solutions**:
1. Check argument types match schema (string vs number)
2. Required fields must be provided
3. Enum values must match exactly (e.g., `"markdown"` not `"md"`)

---

## 📊 Visual Workflow

```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Run Setup Script                               │
│  ./scripts/setup-documentmanagement-tool.sh             │
│                                                          │
│  Output:                                                 │
│  ✅ Tool created: 67abc...                              │
│  ✅ Agent created: 67def...                             │
│  🔑 Agent Token: eyJhbG...                              │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Step 2: Open MCP Inspector                             │
│  npx @modelcontextprotocol/inspector                    │
│                                                          │
│  Browser opens → http://localhost:6274                  │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Step 3: Configure Inspector                            │
│  - Mode: Direct                                          │
│  - URL: http://localhost:3306                           │
│  - Header: Authorization: Bearer eyJhbG...              │
│  - Click: Connect                                        │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Step 4: Test Tools                                      │
│  - See 7 DocumentManagement tools                        │
│  - Click a tool (e.g., cbm_document_create)             │
│  - Fill in arguments                                     │
│  - Click "Call Tool"                                     │
│  - See response                                          │
└──────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Step 5: Verify in CBM                                   │
│  curl http://localhost:3001/documents \                  │
│    -H "Authorization: Bearer $ADMIN_TOKEN"               │
│                                                          │
│  → Should see created documents                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🔗 Quick Commands Reference

### Get Admin Token (for manual verification)
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"username","password":"..."}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])"
```

### List Documents in CBM (manual verification)
```bash
curl http://localhost:3001/documents \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Test MCP Server (command line)
```bash
# Replace $AGENT_TOKEN with token from setup script

# List tools
curl -X POST http://localhost:3306 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Call a tool
curl -X POST http://localhost:3306 \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"ListDocuments",
      "arguments":{"page":1,"limit":10}
    }
  }'
```

---

## 📚 Additional Resources

- [MCP Built-in Tools Documentation](./MCP-BUILTIN-TOOLS.md)
- [CBM Document API](./API-DOCUMENT.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Inspector GitHub](https://github.com/modelcontextprotocol/inspector)

---

## 💡 Tips

1. **Token Expiration**: Agent tokens expire after 24 hours. Re-run setup script to get new token.

2. **Session Persistence**: MCP server maintains session state per agent. You can close and reconnect Inspector without re-registering tools.

3. **Logs**: Watch terminal running `npx nx mcp aiwm` for detailed execution logs.

4. **Error Messages**: Tool execution errors include helpful details - read them carefully!

5. **Multiple Agents**: You can create multiple agents with different tool combinations.

---

**Happy Testing! 🎉**

If you encounter issues, check the troubleshooting section or review service logs.
