# Work Management - Implementation Plan

## Overview

This document outlines the implementation plan for enhancing the CBM Work Management module with:
1. Epic auto-status calculation
2. New action endpoints (assign-and-todo, reject-review)
3. Modified unblock action with feedback
4. Get next work endpoint with priority logic
5. Notification system framework with Discord webhook integration

## Phase 1: Schema and Core Infrastructure

### 1.1 Update Work Schema

**File:** `services/cbm/src/modules/work/work.schema.ts`

**Changes:**
```typescript
@Schema({ timestamps: true })
export class Work extends BaseSchema {
  // ... existing fields ...

  @Prop({ maxlength: 1000 })
  reason?: string; // ONLY for blocked status

  @Prop({ maxlength: 2000 })
  feedback?: string; // For review rejection and unblock feedback (NEW)
}
```

**Notes:**
- `reason`: Used when work is blocked (existing field)
- `feedback`: Used when work is rejected from review or unblocked with notes (new field)

**Estimated effort:** 10 minutes

---

### 1.2 Update Work DTOs

**File:** `services/cbm/src/modules/work/work.dto.ts`

**Add new DTOs:**

```typescript
/**
 * DTO for assigning work and moving to todo
 */
export class AssignAndTodoDto {
  @ApiProperty({
    description: 'Assignee to assign the work to',
    type: ReporterAssigneeDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ReporterAssigneeDto)
  assignee!: ReporterAssigneeDto;
}

/**
 * DTO for rejecting work from review
 */
export class RejectReviewDto {
  @ApiProperty({
    description: 'Feedback explaining why the work was rejected',
    example: 'Implementation does not meet acceptance criteria. Please add unit tests.',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  feedback!: string;
}

/**
 * DTO for unblocking work with optional feedback
 */
export class UnblockWorkDto {
  @ApiPropertyOptional({
    description: 'Feedback explaining how the blocker was resolved',
    example: 'API design finalized. Ready to continue implementation.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}
```

**Estimated effort:** 15 minutes

---

## Phase 2: Epic Auto-Status Calculation

### 2.1 Implement Epic Status Calculation Method

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add method:**

```typescript
/**
 * Calculate epic status based on child tasks
 * - in_progress: Default, or when any task is not done/cancelled
 * - done: All tasks are done
 * - cancelled: Only when manually cancelled
 *
 * @param epicId - Epic ID to calculate status for
 * @param context - Request context
 * @returns Calculated status
 */
async calculateEpicStatus(
  epicId: ObjectId,
  context: RequestContext
): Promise<'in_progress' | 'done'> {
  // Verify epic exists and is actually an epic
  const epic = await this.findById(epicId, context);
  if (!epic) {
    throw new BadRequestException('Epic not found');
  }

  if (epic.type !== 'epic') {
    throw new BadRequestException('Work is not an epic');
  }

  // Find all child tasks
  const tasks = await this.workModel.find({
    parentId: epicId.toString(),
    type: 'task',
    isDeleted: false,
  });

  // No tasks yet = in_progress
  if (tasks.length === 0) {
    return 'in_progress';
  }

  // All tasks done = done
  const allDone = tasks.every(t => t.status === 'done');
  if (allDone) {
    return 'done';
  }

  // All tasks done or cancelled, and at least one is done = done
  const allDoneOrCancelled = tasks.every(t =>
    t.status === 'done' || t.status === 'cancelled'
  );
  const someDone = tasks.some(t => t.status === 'done');

  if (allDoneOrCancelled && someDone) {
    return 'done';
  }

  // Default
  return 'in_progress';
}

/**
 * Recalculate and update epic status
 * Should be called whenever a child task changes status
 *
 * @param epicId - Epic ID to recalculate
 * @param context - Request context
 */
async recalculateEpicStatus(
  epicId: ObjectId,
  context: RequestContext
): Promise<Work> {
  const newStatus = await this.calculateEpicStatus(epicId, context);

  // Update epic status directly (bypass normal update restrictions)
  return this.workModel.findByIdAndUpdate(
    epicId,
    {
      status: newStatus,
      updatedBy: context
    },
    { new: true }
  ).exec() as Promise<Work>;
}
```

**Estimated effort:** 30 minutes

---

### 2.2 Add Manual Recalculation Endpoint

**File:** `services/cbm/src/modules/work/work.controller.ts`

**Add endpoint:**

```typescript
@Post(':id/recalculate-status')
@ApiOperation({
  summary: 'Recalculate epic status',
  description: 'Manually recalculate epic status based on child tasks. Only applies to epics.'
})
@ApiUpdateErrors()
@UseGuards(JwtAuthGuard)
async recalculateStatus(
  @Param('id') id: string,
  @CurrentUser() context: RequestContext
) {
  return this.workService.recalculateEpicStatus(
    new Types.ObjectId(id) as any,
    context
  );
}
```

**Estimated effort:** 10 minutes

---

### 2.3 Integrate Epic Status Recalculation into Task Actions

**File:** `services/cbm/src/modules/work/work.service.ts`

**Modify existing action methods to trigger epic recalculation:**

```typescript
// Helper method to trigger epic recalculation if work has parent epic
private async triggerParentEpicRecalculation(
  work: Work,
  context: RequestContext
): Promise<void> {
  if (work.type === 'task' && work.parentId) {
    const parent = await this.findById(
      new Types.ObjectId(work.parentId) as any,
      context
    );

    if (parent && parent.type === 'epic') {
      await this.recalculateEpicStatus(
        new Types.ObjectId(work.parentId) as any,
        context
      );
    }
  }
}

// Update all action methods to call this helper
async startWork(...) {
  const work = await this.update(...);
  await this.triggerParentEpicRecalculation(work, context);
  return work;
}

// Apply to: completeWork, cancelWork, reopenWork, etc.
```

**Estimated effort:** 30 minutes

---

## Phase 3: New Action Endpoints

### 3.1 Implement Assign-and-Todo Action

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add method:**

```typescript
/**
 * Action: Assign and move to todo
 * Transition: backlog → todo
 * Requires: assignee must be provided
 */
async assignAndTodo(
  id: ObjectId,
  assigneeDto: ReporterAssigneeDto,
  context: RequestContext
): Promise<Work> {
  const work = await this.findById(id, context);
  if (!work) {
    throw new BadRequestException('Work not found');
  }

  if (work.status !== 'backlog') {
    throw new BadRequestException(
      `Cannot assign-and-todo work with status: ${work.status}. Only backlog works can be moved to todo.`
    );
  }

  // Validate assignee exists
  await this.validateEntityExists(assigneeDto.type, assigneeDto.id);

  return this.update(
    id,
    {
      assignee: assigneeDto,
      status: 'todo'
    } as any,
    context
  ) as Promise<Work>;
}
```

**File:** `services/cbm/src/modules/work/work.controller.ts`

**Add endpoint:**

```typescript
@Post(':id/assign-and-todo')
@ApiOperation({
  summary: 'Assign and move to todo',
  description: 'Assign work to user/agent and transition from backlog to todo status'
})
@ApiUpdateErrors()
@UseGuards(JwtAuthGuard)
async assignAndTodo(
  @Param('id') id: string,
  @Body() assignAndTodoDto: AssignAndTodoDto,
  @CurrentUser() context: RequestContext
) {
  return this.workService.assignAndTodo(
    new Types.ObjectId(id) as any,
    assignAndTodoDto.assignee,
    context
  );
}
```

**Estimated effort:** 20 minutes

---

### 3.2 Implement Reject-Review Action

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add method:**

```typescript
/**
 * Action: Reject review
 * Transition: review → todo
 * Requires: feedback explaining why work was rejected
 */
async rejectReview(
  id: ObjectId,
  feedback: string,
  context: RequestContext
): Promise<Work> {
  const work = await this.findById(id, context);
  if (!work) {
    throw new BadRequestException('Work not found');
  }

  if (work.status !== 'review') {
    throw new BadRequestException(
      `Cannot reject work with status: ${work.status}. Only review works can be rejected.`
    );
  }

  if (!feedback || feedback.trim().length === 0) {
    throw new BadRequestException('Feedback is required when rejecting review');
  }

  return this.update(
    id,
    {
      status: 'todo',
      feedback
    } as any,
    context
  ) as Promise<Work>;
}
```

**File:** `services/cbm/src/modules/work/work.controller.ts`

**Add endpoint:**

```typescript
@Post(':id/reject-review')
@ApiOperation({
  summary: 'Reject review',
  description: 'Reject work from review status and move back to todo with feedback'
})
@ApiUpdateErrors()
@UseGuards(JwtAuthGuard)
async rejectReview(
  @Param('id') id: string,
  @Body() rejectReviewDto: RejectReviewDto,
  @CurrentUser() context: RequestContext
) {
  return this.workService.rejectReview(
    new Types.ObjectId(id) as any,
    rejectReviewDto.feedback,
    context
  );
}
```

**Estimated effort:** 20 minutes

---

### 3.3 Modify Unblock Action

**File:** `services/cbm/src/modules/work/work.service.ts`

**Modify method signature and implementation:**

```typescript
/**
 * Action: Unblock work
 * Transition: blocked → todo (CHANGED from in_progress)
 * Optional: feedback explaining how blocker was resolved
 */
async unblockWork(
  id: ObjectId,
  feedback: string | undefined,
  context: RequestContext
): Promise<Work> {
  const work = await this.findById(id, context);
  if (!work) {
    throw new BadRequestException('Work not found');
  }

  if (work.status !== 'blocked') {
    throw new BadRequestException(
      `Cannot unblock work with status: ${work.status}. Only blocked works can be unblocked.`
    );
  }

  return this.update(
    id,
    {
      status: 'todo',  // CHANGED: was 'in_progress'
      reason: null,    // Clear blocked reason
      feedback         // Optional feedback
    } as any,
    context
  ) as Promise<Work>;
}
```

**File:** `services/cbm/src/modules/work/work.controller.ts`

**Modify endpoint:**

```typescript
@Post(':id/unblock')
@ApiOperation({
  summary: 'Unblock work',
  description: 'Transition work from blocked to todo status with optional feedback'
})
@ApiUpdateErrors()
@UseGuards(JwtAuthGuard)
async unblock(
  @Param('id') id: string,
  @Body() unblockWorkDto: UnblockWorkDto,  // NEW DTO
  @CurrentUser() context: RequestContext
) {
  return this.workService.unblockWork(
    new Types.ObjectId(id) as any,
    unblockWorkDto.feedback,  // Pass optional feedback
    context
  );
}
```

**Estimated effort:** 15 minutes

---

## Phase 4: Get Next Work Endpoint

### 4.1 Implement Dependency Validation Helper

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add method:**

```typescript
/**
 * Validate that all dependencies are resolved (done or cancelled)
 *
 * @param work - Work to validate dependencies for
 * @returns true if all dependencies are resolved or no dependencies exist
 */
private async validateDependencies(work: Work): Promise<boolean> {
  // No dependencies = always valid
  if (!work.dependencies || work.dependencies.length === 0) {
    return true;
  }

  // Fetch all dependency works
  const dependencyWorks = await this.workModel.find({
    _id: { $in: work.dependencies.map(id => new Types.ObjectId(id)) },
    isDeleted: false,
  });

  // All dependencies must exist (not deleted)
  if (dependencyWorks.length !== work.dependencies.length) {
    return false; // Some dependencies are missing/deleted
  }

  // All dependencies must be in 'done' or 'cancelled' status
  const allResolved = dependencyWorks.every(dep =>
    dep.status === 'done' || dep.status === 'cancelled'
  );

  return allResolved;
}
```

**Estimated effort:** 15 minutes

---

### 4.2 Implement Get Next Work Method

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add method:**

```typescript
/**
 * Get next work for user/agent based on priority rules
 * See: docs/cbm/NEXT-WORK-PRIORITY-LOGIC.md
 */
async getNextWork(
  assigneeType: 'user' | 'agent',
  assigneeId: string,
  context: RequestContext
): Promise<{
  work: Work | null;
  metadata: {
    priorityLevel: number;
    priorityDescription: string;
    matchedCriteria: string[];
  };
}> {
  // Priority 1: Assigned subtasks in todo
  const subtasks = await this.workModel.find({
    type: 'subtask',
    'assignee.type': assigneeType,
    'assignee.id': assigneeId,
    status: 'todo',
    isDeleted: false,
  }).sort({ createdAt: 1 });

  for (const subtask of subtasks) {
    if (await this.validateDependencies(subtask)) {
      return {
        work: subtask,
        metadata: {
          priorityLevel: 1,
          priorityDescription: 'Assigned subtask in todo status',
          matchedCriteria: ['assigned_to_me', 'subtask', 'status_todo', 'dependencies_met']
        }
      };
    }
  }

  // Priority 2: Assigned tasks without subtasks in todo
  const tasks = await this.workModel.find({
    type: 'task',
    'assignee.type': assigneeType,
    'assignee.id': assigneeId,
    status: 'todo',
    isDeleted: false,
  }).sort({ createdAt: 1 });

  for (const task of tasks) {
    // Check if task has subtasks
    const hasSubtasks = await this.workModel.exists({
      type: 'subtask',
      parentId: task._id.toString(),
      isDeleted: false
    });

    if (hasSubtasks) continue; // Skip tasks with subtasks

    // Check dependencies
    if (await this.validateDependencies(task)) {
      return {
        work: task,
        metadata: {
          priorityLevel: 2,
          priorityDescription: 'Assigned task without subtasks in todo status',
          matchedCriteria: ['assigned_to_me', 'task', 'status_todo', 'no_subtasks', 'dependencies_met']
        }
      };
    }
  }

  // Priority 3: Reported works in blocked status
  const blockedWork = await this.workModel.findOne({
    type: { $in: ['task', 'subtask'] },
    'reporter.type': assigneeType,
    'reporter.id': assigneeId,
    status: 'blocked',
    isDeleted: false,
  }).sort({ createdAt: 1 });

  if (blockedWork) {
    return {
      work: blockedWork,
      metadata: {
        priorityLevel: 3,
        priorityDescription: 'Reported work in blocked status requiring resolution',
        matchedCriteria: ['reported_by_me', 'status_blocked']
      }
    };
  }

  // Priority 4: Reported works in review status
  const reviewWork = await this.workModel.findOne({
    type: { $in: ['task', 'subtask'] },
    'reporter.type': assigneeType,
    'reporter.id': assigneeId,
    status: 'review',
    isDeleted: false,
  }).sort({ createdAt: 1 });

  if (reviewWork) {
    return {
      work: reviewWork,
      metadata: {
        priorityLevel: 4,
        priorityDescription: 'Reported work in review status awaiting approval',
        matchedCriteria: ['reported_by_me', 'status_review']
      }
    };
  }

  // No work found
  return {
    work: null,
    metadata: {
      priorityLevel: 0,
      priorityDescription: 'No work available',
      matchedCriteria: []
    }
  };
}
```

**Estimated effort:** 40 minutes

---

### 4.3 Add Get Next Work Endpoint

**File:** `services/cbm/src/modules/work/work.dto.ts`

**Add DTO:**

```typescript
export class GetNextWorkQueryDto {
  @ApiProperty({
    description: 'Assignee type',
    enum: ['user', 'agent'],
    example: 'user',
  })
  @IsEnum(['user', 'agent'])
  assigneeType!: 'user' | 'agent';

  @ApiProperty({
    description: 'Assignee ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  assigneeId!: string;
}
```

**File:** `services/cbm/src/modules/work/work.controller.ts`

**Add endpoint:**

```typescript
@Get('next-work')
@ApiOperation({
  summary: 'Get next work for user/agent',
  description: 'Returns the next work item based on priority rules. See docs/cbm/NEXT-WORK-PRIORITY-LOGIC.md'
})
@ApiReadErrors({ notFound: false })
@UseGuards(JwtAuthGuard)
async getNextWork(
  @Query() query: GetNextWorkQueryDto,
  @CurrentUser() context: RequestContext
) {
  return this.workService.getNextWork(
    query.assigneeType,
    query.assigneeId,
    context
  );
}
```

**Estimated effort:** 15 minutes

---

## Phase 5: Notification System

### 5.1 Create Notification Configuration

**File:** `services/cbm/src/config/notification.config.ts` (NEW)

```typescript
export interface NotificationConfig {
  discord: {
    enabled: boolean;
    webhookUrl: string;
  };
  // Future: email, notiService
}

export const getNotificationConfig = (): NotificationConfig => {
  return {
    discord: {
      enabled: !!process.env.CBM_DISCORD_WEBHOOK_URL,
      webhookUrl: process.env.CBM_DISCORD_WEBHOOK_URL || '',
    },
  };
};
```

**File:** `.env` (add variable)

```bash
# Discord notification webhook (optional)
CBM_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Estimated effort:** 10 minutes

---

### 5.2 Create Notification Service

**File:** `services/cbm/src/modules/notification/notification.service.ts` (NEW)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { getNotificationConfig } from '../../config/notification.config';
import { Work } from '../work/work.schema';
import { RequestContext } from '@hydrabyte/shared';

export type NotificationEventType =
  | 'work.created'
  | 'work.assigned'
  | 'work.status_changed'
  | 'work.blocked'
  | 'work.review_requested'
  | 'work.completed';

export interface NotificationEvent {
  type: NotificationEventType;
  workId: string;
  work: Work;
  actor: RequestContext;
  previousStatus?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly config = getNotificationConfig();

  /**
   * Send notification asynchronously (fire-and-forget)
   * Does not block the main request
   */
  async notify(event: NotificationEvent): Promise<void> {
    // Fire-and-forget pattern - don't await
    this.sendNotificationAsync(event).catch(err => {
      this.logger.error(`Failed to send notification: ${err.message}`, err.stack);
    });
  }

  /**
   * Async notification sender
   */
  private async sendNotificationAsync(event: NotificationEvent): Promise<void> {
    if (this.config.discord.enabled) {
      await this.sendDiscordNotification(event);
    }

    // Future: Send to email, NOTI service, etc.
  }

  /**
   * Send notification to Discord webhook
   */
  private async sendDiscordNotification(event: NotificationEvent): Promise<void> {
    try {
      const message = this.formatDiscordMessage(event);

      const response = await fetch(this.config.discord.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }

      this.logger.log(`Discord notification sent for ${event.type}: ${event.workId}`);
    } catch (error: any) {
      this.logger.error(`Discord notification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Format notification for Discord
   */
  private formatDiscordMessage(event: NotificationEvent): any {
    const { work, type, actor, previousStatus } = event;

    const colorMap: Record<NotificationEventType, number> = {
      'work.created': 0x00ff00,       // Green
      'work.assigned': 0x0099ff,      // Blue
      'work.status_changed': 0xffaa00, // Orange
      'work.blocked': 0xff0000,       // Red
      'work.review_requested': 0xaa00ff, // Purple
      'work.completed': 0x00ffaa,     // Teal
    };

    const descriptions: Record<NotificationEventType, string> = {
      'work.created': `New work created by ${actor.username || actor.userId}`,
      'work.assigned': `Work assigned to ${work.assignee?.type} ${work.assignee?.id}`,
      'work.status_changed': `Status changed from ${previousStatus} to ${work.status}`,
      'work.blocked': `Work blocked: ${work.reason || 'No reason provided'}`,
      'work.review_requested': `Work ready for review`,
      'work.completed': `Work completed successfully`,
    };

    return {
      embeds: [{
        title: `[${work.type.toUpperCase()}] ${work.title}`,
        description: descriptions[type],
        color: colorMap[type],
        fields: [
          { name: 'Status', value: work.status, inline: true },
          { name: 'Type', value: work.type, inline: true },
          { name: 'ID', value: work._id.toString(), inline: true },
        ],
        timestamp: new Date().toISOString(),
      }]
    };
  }
}
```

**File:** `services/cbm/src/modules/notification/notification.module.ts` (NEW)

```typescript
import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';

@Module({
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
```

**Estimated effort:** 45 minutes

---

### 5.3 Integrate Notifications into Work Module

**File:** `services/cbm/src/modules/work/work.module.ts`

**Add import:**

```typescript
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Work.name, schema: WorkSchema }]),
    NotificationModule,  // ADD THIS
  ],
  // ...
})
export class WorkModule {}
```

**File:** `services/cbm/src/modules/work/work.service.ts`

**Add to constructor and emit events:**

```typescript
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class WorkService extends BaseService<Work> {
  constructor(
    @InjectModel(Work.name) private workModel: Model<Work>,
    private readonly notificationService: NotificationService,  // INJECT
  ) {
    super(workModel);
  }

  // Modify create method
  async create(data: CreateWorkDto, context: RequestContext): Promise<Work> {
    // ... existing validation ...

    const work = await super.create(data as CreateWorkDto, context) as Work;

    // Emit notification
    await this.notificationService.notify({
      type: 'work.created',
      workId: work._id.toString(),
      work,
      actor: context,
    });

    return work;
  }

  // Modify assignAndTodo method
  async assignAndTodo(...): Promise<Work> {
    const work = await this.update(...);

    await this.notificationService.notify({
      type: 'work.assigned',
      workId: work._id.toString(),
      work,
      actor: context,
    });

    return work;
  }

  // Modify blockWork method
  async blockWork(...): Promise<Work> {
    const work = await this.update(...);

    await this.notificationService.notify({
      type: 'work.blocked',
      workId: work._id.toString(),
      work,
      actor: context,
    });

    return work;
  }

  // Modify requestReview method
  async requestReview(...): Promise<Work> {
    const work = await this.update(...);

    await this.notificationService.notify({
      type: 'work.review_requested',
      workId: work._id.toString(),
      work,
      actor: context,
    });

    return work;
  }

  // Modify completeWork method
  async completeWork(...): Promise<Work> {
    const work = await this.update(...);

    await this.notificationService.notify({
      type: 'work.completed',
      workId: work._id.toString(),
      work,
      actor: context,
    });

    return work;
  }

  // Add to other action methods as needed (startWork, unblockWork, etc.)
}
```

**Estimated effort:** 30 minutes

---

## Phase 6: Testing and Documentation

### 6.1 Update API Documentation

**File:** `services/cbm/README.md`

Update with new endpoints and examples.

**Estimated effort:** 30 minutes

---

### 6.2 Manual Testing

Create test scenarios for:
1. Epic status auto-calculation
2. Assign-and-todo workflow
3. Review rejection workflow
4. Unblock with feedback
5. Get next work priority logic
6. Discord notifications

**Estimated effort:** 1 hour

---

## Summary

### Total Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1 | Schema + DTOs | 25 min |
| Phase 2 | Epic auto-status | 70 min |
| Phase 3 | New actions | 55 min |
| Phase 4 | Get next work | 70 min |
| Phase 5 | Notifications | 85 min |
| Phase 6 | Testing + Docs | 90 min |
| **Total** | | **~6.5 hours** |

### Implementation Order

1. ✅ Phase 1: Schema changes (foundation)
2. ✅ Phase 3: New action endpoints (core features)
3. ✅ Phase 2: Epic auto-status (depends on actions)
4. ✅ Phase 4: Get next work (independent)
5. ✅ Phase 5: Notifications (enhancement)
6. ✅ Phase 6: Testing and docs

### Files to Create/Modify

**New Files:**
- `services/cbm/src/config/notification.config.ts`
- `services/cbm/src/modules/notification/notification.service.ts`
- `services/cbm/src/modules/notification/notification.module.ts`

**Modified Files:**
- `services/cbm/src/modules/work/work.schema.ts`
- `services/cbm/src/modules/work/work.dto.ts`
- `services/cbm/src/modules/work/work.service.ts`
- `services/cbm/src/modules/work/work.controller.ts`
- `services/cbm/src/modules/work/work.module.ts`
- `services/cbm/.env`
- `services/cbm/README.md`

---

**Document Version:** 1.0
**Last Updated:** 2025-01-15
