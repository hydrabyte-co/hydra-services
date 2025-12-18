# MCP Built-in Tools Configuration Fix

## Problem Summary

When executing MCP built-in tools (e.g., DocumentManagement tools), the CBM base URL was not being fetched from the Configuration module. Instead, tools were using the hardcoded fallback value `http://localhost:3001` even though the database contained `https://api.x-or.cloud/dev/cbm`.

## Root Cause

The issue was caused by a **closure scope + caching problem**:

1. **Tool Registration Caching**: Tools are registered once per agent using `registeredAgents` Set
2. **Configuration Fetch Location**: Configuration was fetched inside `registerToolsForAgent()` function
3. **Closure Capture**: Tool executors were registered with a closure that captured `cbmBaseUrl` value at registration time
4. **Cache Check**: Subsequent requests skipped `registerToolsForAgent()` entirely due to cache:

```typescript
if (!registeredAgents.has(agentKey)) {
  await registerToolsForAgent(userContext, bearerToken); // Only runs ONCE
  registeredAgents.add(agentKey);
} else {
  logger.debug(`Tools already registered for agent: ${agentKey}`); // Skips on subsequent calls
}
```

5. **Result**: Configuration was never refreshed, and tool executions used the old default value captured in the closure.

## Solution

**Move configuration fetch from registration time to execution time.**

### Before (Broken)

```typescript
// INSIDE registerToolsForAgent() - only runs once
let cbmBaseUrl = 'http://localhost:3001';
const cbmConfig = await configService.findByKey(ConfigKeyEnum.CBM_BASE_URL, context);
if (cbmConfig?.value) cbmBaseUrl = cbmConfig.value;

// Tool executor closure captures cbmBaseUrl
async (args) => {
  const executionContext = {
    cbmBaseUrl: cbmBaseUrl, // ❌ Always uses first-registration value
  };
  return await builtinTool.executor(args, executionContext);
}
```

### After (Fixed)

```typescript
// OUTSIDE registerToolsForAgent() - helper function
const fetchServiceUrls = async (orgId: string, context: RequestContext) => {
  let cbmBaseUrl = 'http://localhost:3001';
  const cbmConfig = await configService.findByKey(ConfigKeyEnum.CBM_BASE_URL, context);
  if (cbmConfig?.value) cbmBaseUrl = cbmConfig.value;
  return { cbmBaseUrl };
};

// INSIDE tool executor - runs on EVERY execution
async (args) => {
  const context = { userId, orgId, agentId, ... };
  const serviceUrls = await fetchServiceUrls(tokenPayload.orgId, context); // ✅ Fetch fresh config

  const executionContext = {
    cbmBaseUrl: serviceUrls.cbmBaseUrl, // ✅ Always uses latest value
  };
  return await builtinTool.executor(args, executionContext);
}
```

## Changes Made

### File: `services/aiwm/src/bootstrap-mcp.ts`

1. **Created `fetchServiceUrls()` helper function** (lines 186-208):
   - Extracts configuration fetching logic into reusable function
   - Can be called on every tool execution
   - Returns `{ cbmBaseUrl }` object

2. **Modified builtin tool executor** (lines 301-344):
   - Fetch configuration dynamically on each execution
   - Build RequestContext from token payload
   - Call `fetchServiceUrls()` to get latest configuration
   - Pass fresh `cbmBaseUrl` to executor

## Benefits

1. **Dynamic Configuration**: Changes to configuration are reflected immediately without restarting service
2. **No Cache Issues**: Configuration is fetched per-request, not per-registration
3. **Debugging Logs**: Added logs to track configuration fetch on every execution
4. **Consistent Pattern**: Can extend to other service URLs (IAM, AIWM) easily

## Testing

After this fix, when you execute a DocumentManagement tool:

1. You should see logs:
   ```
   🔧 Executing builtin tool: ListDocuments
   🔍 Fetching config key: cbm.base_url for org: 691eb9e6517f917943ae1f9d
   🔍 Config result: { value: 'https://api.x-or.cloud/dev/cbm', ... }
   📍 CBM Base URL from config: https://api.x-or.cloud/dev/cbm
   🔍 Service URLs fetched for execution: { cbmBaseUrl: 'https://api.x-or.cloud/dev/cbm' }
   📡 Making request: GET https://api.x-or.cloud/dev/cbm/documents?page=1&limit=10
   ```

2. The tool should call the correct URL from configuration, not the hardcoded fallback.

## Performance Consideration

**Tradeoff**: This solution fetches configuration on every tool execution, which adds a database query per request.

**Optimization Options** (for future if needed):
1. Add in-memory cache with TTL (e.g., 5 minutes)
2. Use Redis for configuration caching
3. Watch for configuration changes and invalidate cache
4. Fetch once per session instead of per tool call

For now, the added latency is acceptable as it ensures correctness and allows dynamic configuration updates.

## Related Files

- [services/aiwm/src/bootstrap-mcp.ts](../../services/aiwm/src/bootstrap-mcp.ts) - Main fix
- [services/aiwm/src/mcp/types.ts](../../services/aiwm/src/mcp/types.ts) - ExecutionContext interface
- [services/aiwm/src/mcp/builtin/cbm/document-management/executors.ts](../../services/aiwm/src/mcp/builtin/cbm/document-management/executors.ts) - Tool executors
- [services/aiwm/src/modules/configuration/enums/config-key.enum.ts](../../services/aiwm/src/modules/configuration/enums/config-key.enum.ts) - ConfigKey enum

## Date

2025-12-18
