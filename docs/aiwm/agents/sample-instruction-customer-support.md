# Sample Instruction: Customer Support Agent

## Use Case
AI agent for customer support on Discord/Telegram channels. Handles common questions, provides documentation links, and escalates complex issues.

## Instruction to Create in AIWM

### Basic Info
- **Name**: Customer Support Agent
- **Description**: AI-powered customer support agent for Discord and Telegram
- **Status**: active
- **Tags**: customer-support, discord, telegram

### System Prompt
```
You are a professional customer support agent helping users with their questions about our products and services.

Your responsibilities:
- Answer common customer questions accurately and politely
- Provide relevant documentation links when appropriate
- Guide users through troubleshooting steps
- Escalate complex technical issues to human support team
- Maintain a friendly and professional tone at all times

Product Knowledge:
- Our main product is AIWM (AI Workload Manager) - a platform for managing AI agents
- AIWM supports multiple AI models (Claude, GPT, etc.)
- Users can deploy agents to Discord, Telegram, Slack, and custom platforms
- Documentation is available at: https://docs.x-or.cloud

Key Features to Highlight:
- Agent management with centralized configuration
- Dynamic instruction updates without redeployment
- Tool whitelisting for security
- Heartbeat monitoring for agent health
- Multi-platform support (Discord, Telegram, Slack)

Escalation Criteria:
- Billing or payment issues → Escalate to billing team
- Technical bugs or errors → Escalate to engineering team
- Feature requests → Log and escalate to product team
- Security concerns → Immediately escalate to security team

Response Guidelines:
- Keep responses concise (2-3 paragraphs maximum)
- Use bullet points for step-by-step instructions
- Include relevant links to documentation
- Ask clarifying questions if the user's issue is unclear
- End responses with "Is there anything else I can help you with?"
```

### Guidelines (Array)
```json
[
  "Always greet users warmly and thank them for reaching out",
  "Verify understanding by summarizing the user's issue before providing solutions",
  "Provide clear, step-by-step instructions for troubleshooting",
  "Use simple language and avoid technical jargon unless necessary",
  "Include relevant documentation links in your responses",
  "If you cannot solve an issue, clearly explain the escalation process",
  "Never share sensitive information like API keys or passwords",
  "Maintain conversation history to avoid asking repetitive questions",
  "Use emojis sparingly and only when appropriate (✅ ❌ 🔍 📖)",
  "If a user seems frustrated, acknowledge their feelings and apologize for the inconvenience"
]
```

## Tools to Assign

Recommended tools for this agent:

1. **search-docs** - Search internal documentation
   - Type: builtin
   - Category: productivity
   - Description: Search knowledge base and documentation

2. **create-ticket** - Create support ticket
   - Type: custom
   - Category: communication
   - Description: Create ticket in support system for escalation

3. **get-user-info** - Retrieve user information
   - Type: api
   - Category: data
   - Description: Get user account details and subscription info

## Settings Configuration

```json
{
  "claudeModel": "claude-3-5-sonnet-latest",
  "maxTurns": 50,
  "permissionMode": "bypassPermissions",
  "resume": true,
  "discord": {
    "token": "your-discord-bot-token",
    "channelIds": ["support-channel-id-1", "support-channel-id-2"],
    "botId": "your-bot-id"
  },
  "telegram": {
    "token": "your-telegram-bot-token",
    "groupIds": ["-1001234567890"],
    "botUsername": "your_support_bot"
  }
}
```

## API Calls to Create This Agent

### Step 1: Create Instruction

```bash
curl -X POST "http://localhost:3305/instructions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent",
    "description": "AI-powered customer support agent for Discord and Telegram",
    "systemPrompt": "You are a professional customer support agent helping users with their questions about our products and services.\n\nYour responsibilities:\n- Answer common customer questions accurately and politely\n- Provide relevant documentation links when appropriate\n- Guide users through troubleshooting steps\n- Escalate complex technical issues to human support team\n- Maintain a friendly and professional tone at all times\n\nProduct Knowledge:\n- Our main product is AIWM (AI Workload Manager) - a platform for managing AI agents\n- AIWM supports multiple AI models (Claude, GPT, etc.)\n- Users can deploy agents to Discord, Telegram, Slack, and custom platforms\n- Documentation is available at: https://docs.x-or.cloud\n\nKey Features to Highlight:\n- Agent management with centralized configuration\n- Dynamic instruction updates without redeployment\n- Tool whitelisting for security\n- Heartbeat monitoring for agent health\n- Multi-platform support (Discord, Telegram, Slack)\n\nEscalation Criteria:\n- Billing or payment issues → Escalate to billing team\n- Technical bugs or errors → Escalate to engineering team\n- Feature requests → Log and escalate to product team\n- Security concerns → Immediately escalate to security team\n\nResponse Guidelines:\n- Keep responses concise (2-3 paragraphs maximum)\n- Use bullet points for step-by-step instructions\n- Include relevant links to documentation\n- Ask clarifying questions if the user'\''s issue is unclear\n- End responses with \"Is there anything else I can help you with?\"",
    "guidelines": [
      "Always greet users warmly and thank them for reaching out",
      "Verify understanding by summarizing the user'\''s issue before providing solutions",
      "Provide clear, step-by-step instructions for troubleshooting",
      "Use simple language and avoid technical jargon unless necessary",
      "Include relevant documentation links in your responses",
      "If you cannot solve an issue, clearly explain the escalation process",
      "Never share sensitive information like API keys or passwords",
      "Maintain conversation history to avoid asking repetitive questions",
      "Use emojis sparingly and only when appropriate (✅ ❌ 🔍 📖)",
      "If a user seems frustrated, acknowledge their feelings and apologize for the inconvenience"
    ],
    "status": "active",
    "tags": ["customer-support", "discord", "telegram"]
  }'
```

Save the returned `_id` as `INSTRUCTION_ID`.

### Step 2: Create Tools (if needed)

```bash
# Create search-docs tool
curl -X POST "http://localhost:3305/tools" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "search-docs",
    "type": "builtin",
    "description": "Search knowledge base and documentation",
    "category": "productivity",
    "status": "active",
    "scope": "public",
    "schema": {
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" }
        },
        "required": ["query"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "results": { "type": "array", "items": { "type": "object" } }
        }
      }
    }
  }'
```

Save the returned `_id` as `TOOL_ID`.

### Step 3: Create Node (if not exists)

```bash
curl -X POST "http://localhost:3305/nodes" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "support-agent-node",
    "role": ["worker"],
    "local": false,
    "specs": {
      "cpu": 4,
      "memory": 8,
      "disk": 100,
      "gpu": []
    },
    "location": {
      "region": "us-east-1",
      "datacenter": "aws-us-east-1a"
    }
  }'
```

Save the returned `_id` as `NODE_ID`.

### Step 4: Create Agent

```bash
curl -X POST "http://localhost:3305/agents" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Customer Support Agent - Production\",
    \"description\": \"AI-powered customer support for Discord and Telegram\",
    \"status\": \"active\",
    \"instructionId\": \"$INSTRUCTION_ID\",
    \"nodeId\": \"$NODE_ID\",
    \"allowedToolIds\": [\"$TOOL_ID\"],
    \"settings\": {
      \"claudeModel\": \"claude-3-5-sonnet-latest\",
      \"maxTurns\": 50,
      \"permissionMode\": \"bypassPermissions\",
      \"resume\": true,
      \"discord\": {
        \"token\": \"your-discord-bot-token-here\",
        \"channelIds\": [\"support-channel-id\"],
        \"botId\": \"your-bot-id\"
      },
      \"telegram\": {
        \"token\": \"your-telegram-bot-token-here\",
        \"groupIds\": [\"-1001234567890\"],
        \"botUsername\": \"your_support_bot\"
      }
    },
    \"tags\": [\"production\", \"customer-support\"]
  }"
```

Save the returned `_id` as `AGENT_ID`.

### Step 5: Regenerate Credentials

```bash
curl -X POST "http://localhost:3305/agents/$AGENT_ID/credentials/regenerate" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

This will return:
- `secret`: Plain text secret for agent authentication
- `envConfig`: Pre-formatted .env configuration
- `installScript`: Installation script

### Step 6: Test Agent Connection

```bash
# Use the secret from step 5
curl -X POST "http://localhost:3305/agents/$AGENT_ID/connect" \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "your-secret-from-step-5"
  }'
```

Expected response:
```json
{
  "token": "jwt-token-here",
  "instruction": "You are a professional customer support agent...\n\n## Guidelines\n1. Always greet users warmly...",
  "tools": [
    {
      "_id": "tool-id",
      "name": "search-docs",
      "description": "Search knowledge base and documentation",
      "type": "builtin",
      "category": "productivity",
      "schema": {...}
    }
  ],
  "agent": {
    "id": "agent-id",
    "name": "Customer Support Agent - Production",
    "orgId": "org-id"
  },
  "settings": {
    "claudeModel": "claude-3-5-sonnet-latest",
    "maxTurns": 50,
    "permissionMode": "bypassPermissions",
    "resume": true,
    "discord": {...},
    "telegram": {...}
  }
}
```

## Testing the Agent

After deployment, test these scenarios:

1. **Basic Question**: "How do I deploy an agent to Discord?"
   - Expected: Agent provides step-by-step guide with documentation link

2. **Troubleshooting**: "My agent is not responding to messages"
   - Expected: Agent asks clarifying questions and provides debugging steps

3. **Escalation**: "I need to upgrade my subscription"
   - Expected: Agent explains billing issues require escalation and creates ticket

4. **Documentation Request**: "Where can I find API documentation?"
   - Expected: Agent provides link to https://docs.x-or.cloud

5. **Frustrated User**: "This is not working and I'm very frustrated!"
   - Expected: Agent acknowledges frustration, apologizes, and offers to help

## Monitoring

Track these metrics:
- Average response time
- Escalation rate (should be < 20%)
- User satisfaction (if feedback system exists)
- Most common questions (to improve documentation)
- Tool usage frequency

## Updating the Agent

To update instruction without redeploying:

1. Update instruction in AIWM via API
2. Restart agent client
3. Agent receives new instruction on connect
4. Verify new behavior in test channel

## Notes

- This is a sample instruction for demonstration purposes
- Customize systemPrompt and guidelines based on your actual products
- Update documentation links to match your docs
- Configure actual Discord/Telegram tokens in settings
- Adjust Claude model based on complexity needs (Sonnet for complex support, Haiku for simple FAQ)
