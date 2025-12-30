# WebSocket JWT Authentication Fix

## Problem

WebSocket connections were failing with error:
```
[ChatGateway] Authentication failed for client XXX: invalid signature
```

## Root Cause

**Environment variable loading timing issue:**

1. `JwtModule.register()` is called **synchronously** when module is imported
2. At that time, `.env` file hasn't been loaded yet by ConfigModule
3. `process.env.JWT_SECRET` was `undefined`
4. ChatModule was using fallback secret `'your-secret-key'`
5. IAM service created tokens with actual `JWT_SECRET` from .env
6. AIWM ChatGateway verified tokens with wrong secret → **invalid signature**

This is the same issue we encountered with MCP service before.

## Solution

Changed from **synchronous** to **asynchronous** module configuration:

### Before (WRONG):
```typescript
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key', // ❌ .env not loaded yet
      signOptions: { expiresIn: '1h' },
    }),
  ],
})
```

### After (CORRECT):
```typescript
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET'); // ✅ .env loaded
        if (!secret) {
          throw new Error('JWT_SECRET required');
        }
        return {
          secret,
          signOptions: { expiresIn: '1h' },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
```

## Files Changed

- `services/aiwm/src/modules/chat/chat.module.ts`
  - Changed `JwtModule.register()` → `JwtModule.registerAsync()`
  - Changed `RedisModule.forRoot()` → `RedisModule.forRootAsync()`
  - Added `ConfigService` import and injection

## Why registerAsync?

1. **Async factory** is called AFTER ConfigModule loads .env file
2. **ConfigService** provides access to environment variables
3. **Guaranteed** to have correct JWT_SECRET from .env
4. **Throws error** if JWT_SECRET is missing (fail fast)

## Testing

### Local Test
```bash
# Ensure .env has JWT_SECRET
grep JWT_SECRET .env

# Build
npx nx build aiwm

# Run
npx nx serve aiwm

# Check logs - should see:
# "Chat WebSocket Gateway initialized"

# Test connection
wscat -c "ws://localhost:3003/chat" -H "Authorization: Bearer YOUR_TOKEN"

# Should connect successfully, no "invalid signature" error
```

### Production Deployment

1. **Ensure .env file exists on server**:
```bash
cat /usr/workspace/repos/core-service/.env | grep JWT_SECRET
```

2. **Deploy new build**:
```bash
# Upload dist/services/aiwm to server
scp -r dist/services/aiwm user@server:/usr/workspace/repos/core-service/dist/services/

# Or rebuild on server
cd /usr/workspace/repos/core-service
npx nx build aiwm
```

3. **Restart PM2 instances**:
```bash
pm2 restart ecosystem.config.js --only core.aiwm.api00
# Or restart all AIWM instances
pm2 restart core.aiwm.api00
pm2 restart core.aiwm.api01
pm2 restart core.aiwm.api02
```

4. **Verify logs**:
```bash
pm2 logs core.aiwm.api00 --lines 50 | grep -i "chat"

# Should see:
# "Chat WebSocket Gateway initialized"
# NOT "invalid signature"
```

5. **Test WebSocket**:
```bash
# Get agent token
TOKEN=$(curl -s -X POST 'https://api.x-or.cloud/dev/aiwm/agents/AGENT_ID/connect' \
  -H 'Content-Type: application/json' \
  -d '{"secret":"AGENT_SECRET"}' | jq -r '.accessToken')

# Connect via WebSocket
wscat -c "wss://api.x-or.cloud/dev/aiwm/chat" -H "Authorization: Bearer $TOKEN"

# Should connect successfully
```

## Related Issues

This is a common pattern in NestJS when using environment variables:

- ❌ **DON'T**: Use `process.env.VAR` in `Module.register({})`
- ✅ **DO**: Use `Module.registerAsync({ useFactory: (config) => ... })`

**Other modules that need this pattern:**
- JwtModule
- TypeOrmModule
- MongooseModule (already using forRoot with string, but could use forRootAsync)
- RedisModule
- Any module that depends on environment variables

## Prevention

**When creating new modules that need env variables:**

1. Always use `registerAsync()` / `forRootAsync()`
2. Inject `ConfigService`
3. Use `configService.get<T>('VAR_NAME')`
4. Throw error if required variable is missing

**Template:**
```typescript
SomeModule.registerAsync({
  useFactory: (configService: ConfigService) => ({
    apiKey: configService.get<string>('API_KEY') ||
      (() => { throw new Error('API_KEY required'); })(),
    // ... other config
  }),
  inject: [ConfigService],
})
```

## References

- Similar fix in MCP service: `services/aiwm/src/bootstrap-mcp.ts`
- NestJS async configuration: https://docs.nestjs.com/techniques/configuration#async-configuration
- NestJS JWT module: https://docs.nestjs.com/security/authentication#jwt-module-async
