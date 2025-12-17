# JWT Authentication Fix

## Problem

Agent heartbeat endpoint returned `401 Unauthorized` with error `"invalid signature"` even though JWT secrets appeared to match during initialization.

## Root Cause

**Module Loading Order Issue**

When using `JwtModule.register()` with synchronous configuration, the module is initialized immediately during import, BEFORE `ConfigModule` has loaded environment variables from `.env` file.

This caused:
- `JwtModule` (token signing) used one secret
- `JwtStrategy` (token verification) used a different secret
- Result: "invalid signature" error

## Solution

Changed from synchronous `register()` to asynchronous `registerAsync()` to ensure `ConfigService` is loaded first.

### Files Changed

1. **libs/base/src/lib/jwt.strategy.ts**
   - Inject `ConfigService` in constructor
   - Use `configService.get<string>('JWT_SECRET')` instead of `process.env.JWT_SECRET`

2. **services/aiwm/src/modules/agent/agent.module.ts**
   - Changed from `JwtModule.register()` to `JwtModule.registerAsync()`
   - Use factory function with injected `ConfigService`

3. **libs/base/src/lib/auth.guard.ts**
   - Removed debug logs (cleanup)

4. **services/aiwm/src/modules/agent/agent.service.ts**
   - Removed debug logs (cleanup)

## Key Changes

### Before (Synchronous - WRONG)

```typescript
JwtModule.register({
  secret: process.env.JWT_SECRET || 'R4md0m_S3cr3t',  // May not be loaded yet!
  signOptions: { expiresIn: '24h' },
}),
```

### After (Asynchronous - CORRECT)

```typescript
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET') || 'R4md0m_S3cr3t',
    signOptions: { expiresIn: '24h' },
  }),
}),
```

## Verification

After deployment, both token signing and verification use the same JWT secret from environment:

```
✅ Agent Connect → Returns valid JWT token
✅ Agent Heartbeat → Successfully validates token (200 OK)
```

## Lesson Learned

Always use `registerAsync()` when module configuration depends on environment variables loaded by `ConfigModule`:

- ✅ **USE**: `JwtModule.registerAsync()` with `ConfigService`
- ❌ **AVOID**: `JwtModule.register()` with `process.env.*`

This applies to all NestJS dynamic modules (MongooseModule, TypeOrmModule, etc.)
