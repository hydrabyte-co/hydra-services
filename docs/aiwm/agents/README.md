# AIWM Agent Documentation

This directory contains documentation for AI agents managed by AIWM (AI Workload Manager).

## Documentation Files

### [CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md)
Complete guide for integrating agent clients with AIWM controller. Covers:
- Environment setup
- AIWM client implementation
- Connection flow
- Heartbeat mechanism
- Claude Code SDK integration
- Platform integration (Discord, Telegram)
- Error handling and best practices

### [AGENT-CONNECTION-FLOW.md](../../AGENT-CONNECTION-FLOW.md)
Backend architecture and API reference for agent management. Covers:
- System architecture
- Agent schema and features
- API endpoints (connect, heartbeat, credentials)
- Instruction merging logic
- Tool assignment
- Security features
- Testing guide

## Quick Start

### For Agent Developers

1. **Get Credentials**: Contact AIWM admin to create your agent and get credentials
2. **Follow Integration Guide**: Read [CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md)
3. **Configure Environment**: Use `.env` configuration provided by admin
4. **Test Connection**: Verify agent connects to AIWM successfully
5. **Deploy**: Deploy your agent to production

### For AIWM Administrators

1. **Create Agent**: Use AIWM API to create new agent
2. **Assign Resources**: Configure instruction and tools for agent
3. **Generate Credentials**: Use `/agents/:id/credentials/regenerate` endpoint
4. **Provide Config**: Share `.env` configuration with agent developer
5. **Monitor**: Track agent connection and heartbeat status

## Agent Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    AIWM Agent Lifecycle                      │
└─────────────────────────────────────────────────────────────┘

1. CREATION (Admin)
   │
   ├─> Admin creates agent in AIWM
   ├─> Admin assigns instruction + tools
   ├─> Admin generates credentials
   └─> Admin provides .env config to developer

2. DEPLOYMENT (Developer)
   │
   ├─> Developer configures agent client with .env
   ├─> Developer implements AIWM integration
   ├─> Developer tests connection locally
   └─> Developer deploys to production

3. OPERATION (Automated)
   │
   ├─> Agent connects to AIWM on startup
   ├─> Agent receives instruction + tools + settings
   ├─> Agent sends heartbeat periodically
   └─> Agent operates with AIWM configuration

4. UPDATES (Admin)
   │
   ├─> Admin updates instruction in AIWM
   ├─> Admin updates tools or settings
   └─> Agent receives new config on restart

5. MONITORING (Admin)
   │
   ├─> View agent connection status
   ├─> Check last heartbeat timestamp
   └─> Monitor agent health metrics
```

## Key Concepts

### Agent
An AI agent instance managed by AIWM. Each agent has:
- **Unique ID**: MongoDB ObjectId for identification
- **Secret**: Hashed authentication credential
- **Instruction**: System prompt and guidelines
- **Tools**: Whitelist of allowed tools
- **Settings**: Runtime configuration (Claude SDK, platform tokens)
- **Status**: active, inactive, busy, suspended

### Instruction
System prompt and guidelines that define agent behavior:
- **System Prompt**: Main instruction text
- **Guidelines**: Numbered rules and constraints
- **Future**: Multi-layer merging (global + specific + context)

### Tools
Functions/capabilities available to the agent:
- **Whitelist**: Only assigned tools are accessible
- **Schema**: Input/output definitions
- **Status**: Must be 'active' to be available
- **Categories**: productivity, communication, data, etc.

### Settings
Dynamic runtime configuration stored in agent:
- **Claude SDK**: model, maxTurns, permissionMode, resume
- **Platform Tokens**: Discord, Telegram credentials
- **Custom Config**: Any JSON-serializable configuration

### Heartbeat
Periodic status report from agent to AIWM:
- **Frequency**: Recommended 60 seconds
- **Status**: online, busy, idle
- **Metrics**: CPU, memory, connections (optional)
- **Tracking**: Updates `lastHeartbeatAt` timestamp

## Architecture Overview

```
┌─────────────────────┐         ┌─────────────────────┐
│   Agent Client      │         │  AIWM Controller    │
│   (Your Code)       │         │  (Backend)          │
├─────────────────────┤         ├─────────────────────┤
│                     │         │                     │
│  1. Connect         │────────>│  Validate           │
│     agentId+secret  │         │  Return JWT+Config  │
│                     │<────────│                     │
│                     │         │                     │
│  2. Receive         │         │                     │
│     - Instruction   │         │  ┌───────────────┐  │
│     - Tools         │         │  │ Instructions  │  │
│     - Settings      │         │  ├───────────────┤  │
│                     │         │  │ Tools         │  │
│  3. Initialize      │         │  ├───────────────┤  │
│     Claude Code SDK │         │  │ Agents        │  │
│                     │         │  └───────────────┘  │
│  4. Start Platform  │         │                     │
│     (Discord/Tele)  │         │                     │
│                     │         │                     │
│  5. Heartbeat       │────────>│  Update Tracking    │
│     Every 60s       │         │                     │
│                     │         │                     │
└─────────────────────┘         └─────────────────────┘
```

## API Endpoints

### Public Endpoints (No Auth Required)

#### POST `/agents/:id/connect`
Authenticate agent and receive configuration

**Request:**
```json
{
  "secret": "agent-secret-here"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "instruction": "You are a helpful AI assistant...",
  "tools": [
    {
      "_id": "tool-id",
      "name": "read-file",
      "description": "Read files from filesystem",
      "schema": { ... }
    }
  ],
  "agent": {
    "id": "agent-id",
    "name": "My Agent",
    "orgId": "org-id"
  },
  "settings": {
    "claudeModel": "claude-3-5-haiku-latest",
    "maxTurns": 100,
    "discord": { ... }
  }
}
```

### Authenticated Endpoints (Require Agent JWT)

#### POST `/agents/:id/heartbeat`
Report agent status and metrics

**Request:**
```json
{
  "status": "online",
  "metrics": {
    "cpu": 45,
    "memory": 60,
    "activeConnections": 3
  }
}
```

**Response:**
```json
{
  "success": true
}
```

### Admin Endpoints (Require Admin JWT)

#### POST `/agents/:id/credentials/regenerate`
Generate new agent credentials

**Response:**
```json
{
  "agentId": "agent-id",
  "secret": "new-secret-here",
  "envConfig": "# .env configuration\nAIWM_ENABLED=true\n...",
  "installScript": "#!/bin/bash\n# Installation script\n..."
}
```

## Environment Variables Reference

### AIWM Integration
- `AIWM_ENABLED`: Enable/disable AIWM integration (true/false)
- `AIWM_BASE_URL`: AIWM controller URL
- `AIWM_AGENT_ID`: Your agent ID from AIWM
- `AIWM_AGENT_SECRET`: Your agent secret from AIWM

### Claude Code SDK
- `CLAUDE_MODEL`: Claude model to use (provided by AIWM)
- `CLAUDE_MAX_TURNS`: Maximum conversation turns (provided by AIWM)
- `CLAUDE_PERMISSION_MODE`: Permission mode (provided by AIWM)
- `CLAUDE_RESUME`: Enable resume mode (provided by AIWM)
- `CLAUDE_CODE_OAUTH_TOKEN`: OAuth token (optional, provided by AIWM)

### Platform Configuration
- `DISCORD_TOKEN`: Discord bot token (provided by AIWM)
- `DISCORD_CHANNEL_ID`: Discord channel IDs (provided by AIWM)
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (provided by AIWM)
- `TELEGRAM_GROUP_ID`: Telegram group IDs (provided by AIWM)

## Testing

### Test Agent Connection

Use the test script to verify AIWM backend:

```bash
./scripts/test-agent-connection.sh
```

### Test Your Agent Client

1. Get credentials from AIWM admin
2. Configure `.env` file
3. Run your agent:
   ```bash
   npm start
   ```
4. Verify connection logs
5. Check heartbeat in AIWM

## Examples

### Minimal Integration Example

```typescript
import { AIWMClient } from './aiwm/aiwm-client';

const aiwm = new AIWMClient({
  enabled: true,
  baseUrl: 'http://localhost:3305',
  agentId: 'your-agent-id',
  agentSecret: 'your-secret',
});

// Connect and get config
const config = await aiwm.connect();
console.log('Instruction:', config.instruction);
console.log('Tools:', config.tools.map(t => t.name));

// Start heartbeat
aiwm.startHeartbeat(60000);
```

### Full Integration Example

See [CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md) for complete examples.

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid secret | Verify credentials, regenerate if needed |
| 404 Not Found | Agent doesn't exist | Contact admin to create agent |
| Agent Suspended | Admin suspended agent | Contact admin to reactivate |
| No Tools Received | No tools assigned | Ask admin to assign tools |
| Heartbeat Failed | Token expired | Reconnect to get new token |

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'aiwm:*';
```

## Security Considerations

### Secret Management
- **Never commit** `.env` files to git
- **Never log** agent secrets
- **Rotate secrets** periodically
- **Use environment variables** for all credentials

### JWT Tokens
- Tokens expire after 24 hours
- Implement auto-reconnect before expiry
- Don't share tokens between agents
- Don't log full tokens

### Network Security
- Use HTTPS in production
- Verify SSL certificates
- Implement request timeouts
- Handle network failures gracefully

## Performance Tips

### Connection Management
- Connect once on startup
- Reconnect before token expiry (23 hours)
- Implement exponential backoff for retries
- Cache instruction and tools locally

### Heartbeat Optimization
- Use 60-second interval (don't spam)
- Send minimal metrics
- Don't block on heartbeat failures
- Use async/non-blocking calls

## Roadmap

### Current Features (v1.0)
- ✅ Agent authentication
- ✅ Instruction delivery
- ✅ Tool assignment
- ✅ Settings management
- ✅ Heartbeat tracking
- ✅ Credentials regeneration

### Planned Features (v2.0)
- 🔄 Global instruction merging
- 🔄 Context-based instructions
- 🔄 Dynamic tool loading
- 🔄 Health monitoring dashboard
- 🔄 Auto-reconnect mechanism
- 🔄 Token refresh endpoint

### Future Features (v3.0)
- 📋 Agent deployment automation
- 📋 Multi-tenant isolation
- 📋 Agent analytics and metrics
- 📋 A/B testing for instructions
- 📋 Tool usage analytics

## Related Documentation

- [AGENT-CONNECTION-FLOW.md](../../AGENT-CONNECTION-FLOW.md) - Backend architecture
- [AIWM Service README](../../../services/aiwm/README.md) - Service overview
- [Test Script](../../../scripts/test-agent-connection.sh) - Integration testing

## Getting Help

1. **Documentation**: Read this guide and integration guide
2. **API Docs**: Visit http://localhost:3305/api-docs
3. **Test Script**: Use `test-agent-connection.sh` to verify setup
4. **Admin Support**: Contact AIWM administrator for credential issues

## Contributing

When adding new features to agent integration:

1. Update [CLIENT-INTEGRATION-GUIDE.md](./CLIENT-INTEGRATION-GUIDE.md)
2. Add examples and code snippets
3. Update this README with new concepts
4. Update test script if needed
5. Document breaking changes

## License

Internal documentation for Hydra Byte services.
