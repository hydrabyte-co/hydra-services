# Simplified Schema Design - Conversation & Message

## 1. Conversation Schema (Minimal)

### Schema Definition

```typescript
// services/aiwm/src/modules/conversation/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation extends BaseSchema {
  // Conversation title (auto-generated from first message or user-set)
  @Prop({ required: true })
  title: string;

  // Brief description (optional)
  @Prop({ default: '' })
  description: string;

  // Primary agent handling this conversation
  @Prop({ required: true, type: String, ref: 'Agent', index: true })
  agentId: string;

  // Model used by agent
  @Prop({ required: true, type: String, ref: 'Model' })
  modelId: string;

  // Conversation type: 'chat', 'support', 'workflow'
  @Prop({ required: true, default: 'chat' })
  conversationType: string;

  // Status: 'active', 'archived', 'closed'
  @Prop({ required: true, default: 'active', index: true })
  status: string;

  // Total tokens consumed
  @Prop({ default: 0 })
  totalTokens: number;

  // Total messages count
  @Prop({ default: 0 })
  totalMessages: number;

  // Total cost (in USD)
  @Prop({ default: 0 })
  totalCost: number;

  // Simplified participants
  @Prop({
    type: [
      {
        type: { type: String, enum: ['user', 'agent'], required: true },
        id: { type: String, required: true },
        joined: { type: Date, required: true, default: Date.now },
      },
    ],
    default: [],
  })
  participants: Array<{
    type: 'user' | 'agent';
    id: string;
    joined: Date;
  }>;

  // Last message preview
  @Prop({ type: Object, required: false })
  lastMessage?: {
    content: string;
    role: string;
    createdAt: Date;
  };

  // Tags for categorization
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Active status
  @Prop({ default: true })
  isActive: boolean;

  // ✅ SIMPLIFIED: Only summary for now
  @Prop({ type: String, required: false })
  contextSummary?: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes
ConversationSchema.index({ agentId: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ 'participants.id': 1, status: 1 });
ConversationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ tags: 1 });
```

---

## 2. Context Summary - Update Strategy

### 2.1. Khi nào update contextSummary?

#### Option 1: Auto-update mỗi 10 messages (Recommended)

```typescript
// services/aiwm/src/modules/message/message.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from './message.schema';
import { ConversationService } from '../conversation/conversation.service';
import { UtilService } from '../util/util.service';

@Injectable()
export class MessageService extends BaseService<Message> {
  constructor(
    @InjectModel(Message.name) model: Model<Message>,
    private conversationService: ConversationService,
    private utilService: UtilService, // AIWM already has this for AI text generation
  ) {
    super(model);
  }

  async create(dto: CreateMessageDto, context: RequestContext) {
    // Save message
    const message = await super.create(dto, context);

    // Update conversation stats
    const conversation = await this.conversationService.findById(
      dto.conversationId,
    );

    const newTotalMessages = conversation.totalMessages + 1;

    await this.conversationService.update(
      dto.conversationId,
      {
        totalMessages: newTotalMessages,
        totalTokens: conversation.totalTokens + (message.usage?.totalTokens || 0),
        lastMessage: {
          content: message.content.substring(0, 100),
          role: message.role,
          createdAt: message.createdAt,
        },
      },
      context,
    );

    // Auto-generate summary every 10 messages
    if (newTotalMessages % 10 === 0) {
      await this.generateConversationSummary(dto.conversationId);
    }

    return message;
  }

  private async generateConversationSummary(conversationId: string) {
    try {
      // Get last 20 messages
      const messages = await this.model
        .find({ conversationId, isActive: true })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Reverse to chronological order
      messages.reverse();

      // Build conversation history text
      const conversationText = messages
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      // Generate summary using UtilService (OpenAI)
      const summary = await this.utilService.generateText({
        fieldDescription: `Summarize this conversation in 2-3 sentences. Focus on main topics and decisions:\n\n${conversationText}`,
        maxLength: 300,
      });

      // Update conversation
      await this.conversationService.model.updateOne(
        { _id: conversationId },
        { $set: { contextSummary: summary } },
      );

      console.log(`✅ Generated summary for conversation ${conversationId}`);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      // Don't throw - it's not critical
    }
  }
}
```

#### Option 2: Manual trigger by user

```typescript
// services/aiwm/src/modules/conversation/conversation.controller.ts
import { Controller, Post, Param } from '@nestjs/common';

@Controller('conversations')
export class ConversationController {
  constructor(
    private conversationService: ConversationService,
    private messageService: MessageService,
  ) {}

  @Post(':id/summarize')
  @UseGuards(JwtAuthGuard)
  async summarizeConversation(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.messageService.generateConversationSummary(id);
  }
}
```

#### Option 3: Background job (Bull Queue)

```typescript
// services/aiwm/src/queues/processors/summary.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('conversation-summary')
export class SummaryProcessor {
  constructor(private messageService: MessageService) {}

  @Process('generate-summary')
  async handleGenerateSummary(job: Job) {
    const { conversationId } = job.data;
    await this.messageService.generateConversationSummary(conversationId);
  }
}

// Trigger job
await this.summaryQueue.add('generate-summary', {
  conversationId: 'conv-123',
}, {
  delay: 5000, // Wait 5 seconds after 10th message
});
```

### 2.2. Sử dụng contextSummary

```typescript
// When agent needs to respond, include summary in context
async buildAgentContext(conversationId: string) {
  const conversation = await this.conversationService.findById(conversationId);
  const recentMessages = await this.messageService.find({
    conversationId,
    limit: 10,
    sort: '-createdAt',
  });

  return {
    summary: conversation.contextSummary || 'New conversation',
    recentMessages: recentMessages.reverse(),
  };
}

// Send to AI
const systemPrompt = `
You are an AI assistant.

Conversation summary: ${context.summary}

Recent messages:
${context.recentMessages.map(m => `${m.role}: ${m.content}`).join('\n')}

Respond to the user's latest question.
`;
```

---

## 3. Message Schema (Simplified Attachments)

### Schema Definition

```typescript
// services/aiwm/src/modules/message/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  // Reference to conversation
  @Prop({ required: true, type: String, ref: 'Conversation', index: true })
  conversationId: string;

  // Agent that handled this message
  @Prop({ required: false, type: String, ref: 'Agent' })
  agentId?: string;

  // Message role: 'user', 'agent', 'system', 'tool'
  @Prop({
    required: true,
    enum: ['user', 'agent', 'system', 'tool'],
    index: true,
  })
  role: 'user' | 'agent' | 'system' | 'tool';

  // Message content
  @Prop({ required: true, type: String })
  content: string;

  // Message type
  @Prop({
    required: false,
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    default: 'text',
  })
  messageType?: string;

  // Name (for tool messages)
  @Prop({ required: false })
  name?: string;

  // Parent message ID (for threading)
  @Prop({ required: false, type: String, ref: 'Message' })
  parentMessageId?: string;

  // Tool calls
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true },
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true },
        },
      },
    ],
    required: false,
  })
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;

  // Tool results
  @Prop({
    type: [
      {
        toolCallId: { type: String, required: true },
        toolName: { type: String, required: true },
        result: { type: Object, required: true },
        success: { type: Boolean, required: true },
        error: { type: String, required: false },
        executionTime: { type: Number, required: false },
      },
    ],
    required: false,
  })
  toolResults?: Array<{
    toolCallId: string;
    toolName: string;
    result: any;
    success: boolean;
    error?: string;
    executionTime?: number;
  }>;

  // Agent thinking
  @Prop({ type: Object, required: false })
  thinking?: {
    content: string;
    visible: boolean;
    duration: number;
  };

  // Token usage
  @Prop({
    type: {
      promptTokens: { type: Number, required: true },
      completionTokens: { type: Number, required: true },
      totalTokens: { type: Number, required: true },
    },
    required: false,
  })
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  // Response latency
  @Prop({ required: false })
  latency?: number;

  // Error info
  @Prop({ required: false })
  error?: string;

  // Message status
  @Prop({
    required: false,
    enum: ['sending', 'sent', 'delivered', 'failed'],
    default: 'sent',
  })
  messageStatus?: string;

  // ✅ SIMPLIFIED: Attachments as string array
  // Parse by prefix: https://, document:, file:, etc.
  @Prop({ type: [String], required: false })
  attachments?: string[];

  // Active status
  @Prop({ default: true })
  isActive: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, role: 1 });
MessageSchema.index({ agentId: 1, createdAt: -1 });
MessageSchema.index({ parentMessageId: 1 });
MessageSchema.index({ messageType: 1 });
```

---

## 4. Attachments - String Array Pattern

### 4.1. Format Specification

```typescript
// Pattern detection by prefix
attachments: [
  // File URL (S3, MinIO, CDN)
  "https://s3.amazonaws.com/bucket/report.pdf",
  "https://cdn.example.com/images/chart.png",

  // CBM Document reference
  "document:doc-xyz789abc",
  "document:doc-abc123def",

  // Future: Other types
  "file:local-id-123",
  "image:img-456",
]
```

### 4.2. Helper Functions

```typescript
// services/aiwm/src/modules/message/attachment.helper.ts

export class AttachmentHelper {
  /**
   * Detect attachment type from string
   */
  static getType(attachment: string): 'url' | 'document' | 'unknown' {
    if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
      return 'url';
    }
    if (attachment.startsWith('document:')) {
      return 'document';
    }
    return 'unknown';
  }

  /**
   * Get document ID from document: prefix
   */
  static getDocumentId(attachment: string): string | null {
    if (attachment.startsWith('document:')) {
      return attachment.substring('document:'.length);
    }
    return null;
  }

  /**
   * Get filename from URL
   */
  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Parse attachment to display info
   */
  static parse(attachment: string): {
    type: string;
    url?: string;
    documentId?: string;
    filename?: string;
  } {
    const type = this.getType(attachment);

    if (type === 'url') {
      return {
        type: 'url',
        url: attachment,
        filename: this.getFilenameFromUrl(attachment),
      };
    }

    if (type === 'document') {
      return {
        type: 'document',
        documentId: this.getDocumentId(attachment),
      };
    }

    return { type: 'unknown' };
  }

  /**
   * Validate attachment string
   */
  static isValid(attachment: string): boolean {
    const type = this.getType(attachment);

    if (type === 'url') {
      try {
        new URL(attachment);
        return true;
      } catch {
        return false;
      }
    }

    if (type === 'document') {
      const docId = this.getDocumentId(attachment);
      return docId !== null && docId.length > 0;
    }

    return false;
  }

  /**
   * Create document attachment string
   */
  static createDocumentAttachment(documentId: string): string {
    return `document:${documentId}`;
  }
}
```

### 4.3. Usage Examples

#### Backend - Creating Message with Attachments

```typescript
// User uploads file → Store in S3 → Save message
const fileUrl = await uploadToS3(file);

await messageService.create({
  conversationId: 'conv-123',
  role: 'user',
  content: 'Please review this report',
  attachments: [fileUrl], // https://s3.amazonaws.com/...
}, context);

// Agent creates document → Reference CBM document
const document = await cbmService.createDocument({
  title: 'Analysis Report',
  content: '...',
});

await messageService.create({
  conversationId: 'conv-123',
  role: 'agent',
  content: 'Here is the analysis',
  attachments: [
    AttachmentHelper.createDocumentAttachment(document.id), // document:abc123
  ],
  agentId: 'agent-123',
}, context);
```

#### Backend - Reading Attachments

```typescript
const message = await messageService.findById('msg-123');

if (message.attachments?.length > 0) {
  message.attachments.forEach(attachment => {
    const parsed = AttachmentHelper.parse(attachment);

    if (parsed.type === 'url') {
      console.log(`File URL: ${parsed.url}`);
      console.log(`Filename: ${parsed.filename}`);
    } else if (parsed.type === 'document') {
      console.log(`Document ID: ${parsed.documentId}`);
      // Fetch from CBM
      const doc = await cbmService.getDocument(parsed.documentId);
    }
  });
}
```

### 4.4. Frontend - Rendering Attachments

```typescript
// React component
function MessageAttachments({ attachments }: { attachments: string[] }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="attachments">
      {attachments.map((attachment, index) => {
        const parsed = AttachmentHelper.parse(attachment);

        if (parsed.type === 'url') {
          // Direct file URL
          return (
            <a
              key={index}
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              📎 {parsed.filename}
            </a>
          );
        }

        if (parsed.type === 'document') {
          // CBM document
          return (
            <a
              key={index}
              href={`/documents/${parsed.documentId}`}
              target="_blank"
            >
              📄 View Document
            </a>
          );
        }

        return null;
      })}
    </div>
  );
}
```

### 4.5. Frontend - Helper (TypeScript)

```typescript
// frontend/utils/attachment-helper.ts
export class AttachmentHelper {
  static parse(attachment: string) {
    if (attachment.startsWith('http://') || attachment.startsWith('https://')) {
      return {
        type: 'url',
        url: attachment,
        filename: this.getFilenameFromUrl(attachment),
      };
    }

    if (attachment.startsWith('document:')) {
      return {
        type: 'document',
        documentId: attachment.substring('document:'.length),
      };
    }

    return { type: 'unknown' };
  }

  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return decodeURIComponent(pathname.substring(pathname.lastIndexOf('/') + 1));
    } catch {
      return 'file';
    }
  }

  static getDocumentUrl(documentId: string): string {
    return `/api/documents/${documentId}`;
  }
}
```

---

## 5. Sample Data

### 5.1. Conversation with Summary

```json
{
  "_id": "67890abc12345def",
  "title": "Sales Analysis Q1 2025",
  "description": "",
  "agentId": "agent-analyst-001",
  "modelId": "model-gpt4",
  "conversationType": "chat",
  "status": "active",
  "totalTokens": 5420,
  "totalMessages": 15,
  "totalCost": 0.054,

  "participants": [
    {
      "type": "user",
      "id": "user-john-doe",
      "joined": "2025-01-15T10:00:00Z"
    },
    {
      "type": "agent",
      "id": "agent-analyst-001",
      "joined": "2025-01-15T10:00:00Z"
    }
  ],

  "lastMessage": {
    "content": "The analysis shows a 12.5% growth in Q1...",
    "role": "agent",
    "createdAt": "2025-01-15T10:15:00Z"
  },

  "tags": ["sales", "analysis", "q1-2025"],

  "contextSummary": "User requested sales data analysis for Q1 2025. Agent retrieved data from database, performed statistical analysis, and identified a 12.5% growth trend compared to Q4 2024. Key focus areas were North Region performance and product category breakdowns.",

  "createdBy": "user-john-doe",
  "orgId": "org-acme-corp",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:15:00Z"
}
```

### 5.2. Message with File URL Attachment

```json
{
  "_id": "msg-001",
  "conversationId": "67890abc12345def",
  "role": "user",
  "messageType": "text",
  "content": "Please analyze this sales spreadsheet",
  "attachments": [
    "https://s3.amazonaws.com/my-bucket/sales-q1-2025.xlsx"
  ],
  "createdBy": "user-john-doe",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### 5.3. Message with Document Reference

```json
{
  "_id": "msg-002",
  "conversationId": "67890abc12345def",
  "role": "agent",
  "messageType": "text",
  "content": "I've completed the analysis. Here is the detailed report.",
  "agentId": "agent-analyst-001",
  "attachments": [
    "document:doc-xyz789abc"
  ],
  "usage": {
    "promptTokens": 450,
    "completionTokens": 120,
    "totalTokens": 570
  },
  "latency": 2300,
  "createdAt": "2025-01-15T10:05:00Z"
}
```

### 5.4. Message with Multiple Attachments

```json
{
  "_id": "msg-003",
  "conversationId": "67890abc12345def",
  "role": "agent",
  "messageType": "text",
  "content": "Here are all the resources you requested:",
  "agentId": "agent-helper",
  "attachments": [
    "document:doc-guide-001",
    "document:doc-api-docs-002",
    "https://cdn.example.com/downloads/code-samples.zip"
  ],
  "createdAt": "2025-01-15T10:10:00Z"
}
```

---

## 6. Validation

### DTO for Message Creation

```typescript
// services/aiwm/src/modules/message/dto/create-message.dto.ts
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(['user', 'agent', 'system', 'tool'])
  role: 'user' | 'agent' | 'system' | 'tool';

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];

  // ... other fields
}
```

### Custom Validator for Attachments

```typescript
// services/aiwm/src/modules/message/validators/attachment.validator.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AttachmentHelper } from '../attachment.helper';

@ValidatorConstraint({ async: false })
export class IsValidAttachmentConstraint implements ValidatorConstraintInterface {
  validate(attachments: string[]) {
    if (!Array.isArray(attachments)) return false;
    return attachments.every(att => AttachmentHelper.isValid(att));
  }

  defaultMessage() {
    return 'Invalid attachment format. Must be URL or document:id';
  }
}

export function IsValidAttachment(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidAttachmentConstraint,
    });
  };
}

// Usage in DTO
export class CreateMessageDto {
  @IsArray()
  @IsValidAttachment()
  @IsOptional()
  attachments?: string[];
}
```

---

## Summary

### ✅ Conversation
- Removed `conversationId` (use `_id`)
- Simplified `participants`
- **Only `contextSummary: string`** (không phức tạp)
- Auto-update summary mỗi 10 messages

### ✅ Message
- `role`: 'user' | **'agent'** | 'system' | 'tool'
- **Simplified `attachments: string[]`**
  - File URL: `https://...`
  - Document: `document:abc123`
- Helper class để parse

### ✅ Context Summary Update
1. **Auto:** Mỗi 10 messages
2. **Manual:** User click "Summarize"
3. **Background:** Bull Queue (optional)

### ✅ Attachments Pattern
```typescript
attachments: [
  "https://s3.amazonaws.com/file.pdf",  // Direct URL
  "document:doc-xyz789"                 // CBM document
]
```

**Pros:**
- ✅ Đơn giản, dễ implement
- ✅ Dễ validate (URL hoặc document: prefix)
- ✅ Flexible cho future types
- ✅ Ít storage overhead

**Cons:**
- ❌ Không có metadata (filename, size) ngay trong DB
- ❌ Phải parse mỗi lần render

**Trade-off:** Acceptable cho MVP, có thể nâng cấp sau nếu cần metadata.
