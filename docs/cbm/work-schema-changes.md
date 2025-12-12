# Work Module Schema Changes

## Overview
Modified the Work module schema to improve field naming and add block reason tracking.

## Changes Made

### 1. Removed `summary` Field
- **Location**: `work.schema.ts` line 27
- **Reason**: Redundant field - Work already has `title` and `description`
- **Impact**:
  - Removed from schema
  - Removed from CreateWorkDto
  - Removed from UpdateWorkDto
  - Removed from full-text search index

### 2. Renamed `blockedBy` → `dependencies`
- **Location**: `work.schema.ts` line 55
- **Old Name**: `blockedBy: string[]`
- **New Name**: `dependencies: string[]`
- **Reason**: Better semantic naming - "blockedBy" could be confused with the "blocked" status
- **Impact**:
  - Updated schema field name and comment
  - Updated CreateWorkDto field name
  - Updated UpdateWorkDto field name
  - Updated `canTriggerAgent()` method to use new field name
  - Updated validation messages

### 3. Added `reason` Field
- **Location**: `work.schema.ts` line 58
- **Type**: `string` (optional, max 1000 characters)
- **Purpose**: Store explanation of why work is blocked
- **Impact**:
  - Added to schema
  - Added to CreateWorkDto (optional)
  - Added to UpdateWorkDto (optional)
  - Created new `BlockWorkDto` with required reason field
  - Modified `blockWork()` method to require and save reason
  - Modified `unblockWork()` method to clear reason when unblocking

## Modified Files

### Schema Files
1. **services/cbm/src/modules/work/work.schema.ts**
   - Removed `summary` field
   - Renamed `blockedBy` → `dependencies`
   - Added `reason` field
   - Updated full-text search index

### DTO Files
2. **services/cbm/src/modules/work/work.dto.ts**
   - Removed `summary` from CreateWorkDto
   - Removed `summary` from UpdateWorkDto
   - Renamed `blockedBy` → `dependencies` in both DTOs
   - Added `reason` to both DTOs (optional)
   - Created new `BlockWorkDto` class with required `reason` field

### Service Files
3. **services/cbm/src/modules/work/work.service.ts**
   - Updated `blockWork()` signature to accept `reason` parameter
   - Added validation: reason is required when blocking
   - Updated `blockWork()` to save reason along with status change
   - Updated `unblockWork()` to clear reason field when unblocking
   - Updated `canTriggerAgent()` to use `dependencies` instead of `blockedBy`
   - Updated all related comments and validation messages

### Controller Files
4. **services/cbm/src/modules/work/work.controller.ts**
   - Imported `BlockWorkDto`
   - Updated block endpoint to accept `BlockWorkDto` in request body
   - Updated API documentation for block endpoint

## API Impact

### Breaking Changes

#### POST /works/:id/block
**Before:**
```bash
curl -X POST http://localhost:3001/works/{id}/block \
  -H "Authorization: Bearer $TOKEN"
```

**After:**
```bash
curl -X POST http://localhost:3001/works/{id}/block \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Waiting for API design to be finalized"
  }'
```

#### Field Name Changes
- All references to `blockedBy` should now use `dependencies`
- Example in CreateWorkDto:
```json
{
  "title": "Implement feature X",
  "dependencies": ["693bd401e313d1c3edfb403d"],
  "reason": "Optional reason if status is blocked"
}
```

## Database Migration Notes

### For Existing Data
If you have existing Work documents in MongoDB:

1. **Field Rename**: MongoDB will need a migration to rename `blockedBy` → `dependencies`
```javascript
db.works.updateMany(
  {},
  { $rename: { "blockedBy": "dependencies" } }
)
```

2. **Remove Summary**: Optional cleanup to remove old summary field
```javascript
db.works.updateMany(
  {},
  { $unset: { "summary": "" } }
)
```

3. **Add Reason**: No migration needed - new optional field

### Index Updates
MongoDB will automatically rebuild the full-text search index on next insert/update.

## Testing Recommendations

1. **Test Block Action with Reason**
   - Verify blocking requires reason field
   - Verify reason is saved to database
   - Verify error when reason is empty/missing

2. **Test Unblock Action**
   - Verify reason field is cleared when unblocking

3. **Test Dependencies Field**
   - Verify creating work with dependencies
   - Verify updating dependencies
   - Verify canTriggerAgent checks dependencies

4. **Test Backward Compatibility**
   - Existing works without reason field should work
   - GET endpoints should handle missing fields gracefully

## Build Verification

✅ Build successful: `npx nx build cbm`
- No TypeScript errors
- Webpack compiled successfully
- All changes type-safe

## Next Steps

1. Update test-cbm.sh script to use new API format
2. Update docs/cbm/test-scenarios.md with new examples
3. Run database migration if needed
4. Update frontend code to use `dependencies` instead of `blockedBy`
5. Update API client libraries/SDKs
