# Final Schema Design - Conversation & Message

## 1. Conversation Schema (Simplified & Optimized)

### Mục đích
Quản lý cuộc hội thoại giữa Users và AI Agents, track metadata và context cho AI memory.

### Schema Definition

```typescript
// services/aiwm/src/modules/conversation/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation extends BaseSchema {
  // ❌ REMOVED: conversationId (dùng _id mặc định của MongoDB)

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

  // Conversation type: 'chat', 'support', 'workflow', etc.
  @Prop({ required: true, default: 'chat' })
  conversationType: string;

  // Status: 'active', 'archived', 'closed'
  @Prop({ required: true, default: 'active', index: true })
  status: string;

  // Total tokens consumed in this conversation
  @Prop({ default: 0 })
  totalTokens: number;

  // Total messages count
  @Prop({ default: 0 })
  totalMessages: number;

  // Total cost (in USD)
  @Prop({ default: 0 })
  totalCost: number;

  // ✅ UPDATED: Simplified participants structure
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
    type: 'user' | 'agent';  // Type of participant
    id: string;              // userId or agentId
    joined: Date;            // When they joined
  }>;

  // Last message preview (for conversation list UI)
  @Prop({ type: Object, required: false })
  lastMessage?: {
    content: string;
    role: string;
    createdAt: Date;
  };

  // Tags for categorization/filtering
  @Prop({ type: [String], default: [] })
  tags: string[];

  // Active status
  @Prop({ default: true })
  isActive: boolean;

  // ✅ Context for AI memory and conversation intelligence
  // Purpose: Store conversation summary, entities, topics for better AI responses
  @Prop({ type: Object, required: false })
  context?: {
    // AI-generated conversation summary (updated periodically)
    // Used for: Quick recap, context window optimization
    summary?: string;

    // Extracted named entities (people, places, organizations)
    // Used for: Personalization, entity tracking across conversations
    entities?: Array<{
      type: string;      // 'person', 'organization', 'location', 'date'
      value: string;     // 'John Doe', 'Microsoft', 'Hanoi'
      count: number;     // How many times mentioned
    }>;

    // Detected conversation topics
    // Used for: Topic-based search, related conversations
    topics?: string[];   // ['sales', 'Q1-report', 'customer-service']

    // Overall sentiment analysis
    // Used for: Customer satisfaction tracking, support prioritization
    sentiment?: string;  // 'positive', 'negative', 'neutral'

    // User preferences detected in conversation
    // Used for: Personalization in future responses
    preferences?: Record<string, any>;  // { language: 'vi', formality: 'casual' }

    // Important facts/decisions made in conversation
    // Used for: Reference in future messages
    facts?: string[];    // ['User prefers email over phone', 'Budget: $10k']
  };
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for performance
ConversationSchema.index({ agentId: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ 'participants.id': 1, status: 1 });
ConversationSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
ConversationSchema.index({ tags: 1 });
```

---

## 2. Message Schema (Enhanced with Attachments)

### Mục đích
Lưu trữ tất cả messages trong conversation bao gồm text, tool calls, agent thinking, và attachments.

### Schema Definition

```typescript
// services/aiwm/src/modules/message/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseSchema } from '@hydrabyte/base';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message extends BaseSchema {
  // Reference to conversation (using conversation._id)
  @Prop({ required: true, type: String, ref: 'Conversation', index: true })
  conversationId: string;

  // Agent that handled this message (if role=agent)
  @Prop({ required: false, type: String, ref: 'Agent' })
  agentId?: string;

  // ✅ UPDATED: Role changed 'assistant' → 'agent'
  // Message role: 'user', 'agent', 'system', 'tool'
  @Prop({
    required: true,
    enum: ['user', 'agent', 'system', 'tool'],
    index: true,
  })
  role: 'user' | 'agent' | 'system' | 'tool';

  // Message content (text)
  @Prop({ required: true, type: String })
  content: string;

  // Message type for special rendering
  // 'text': Normal text message
  // 'thinking': Agent's reasoning/thinking process
  // 'tool_call': Agent is calling a tool
  // 'tool_result': Result from tool execution
  // 'error': Error message
  // 'system': System notification
  @Prop({
    required: false,
    enum: ['text', 'thinking', 'tool_call', 'tool_result', 'error', 'system'],
    default: 'text',
  })
  messageType?: string;

  // Name (for function/tool messages)
  @Prop({ required: false })
  name?: string;

  // Parent message ID (for threading/replies)
  @Prop({ required: false, type: String, ref: 'Message' })
  parentMessageId?: string;

  // Tool calls made by agent (MCP tools)
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        type: { type: String, required: true }, // 'function', 'mcp_tool'
        function: {
          name: { type: String, required: true },
          arguments: { type: String, required: true }, // JSON string
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

  // Tool results (responses from tools)
  @Prop({
    type: [
      {
        toolCallId: { type: String, required: true },
        toolName: { type: String, required: true },
        result: { type: Object, required: true },
        success: { type: Boolean, required: true },
        error: { type: String, required: false },
        executionTime: { type: Number, required: false }, // ms
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

  // Agent thinking/reasoning (Claude Code style)
  @Prop({ type: Object, required: false })
  thinking?: {
    content: string;      // Thinking text
    visible: boolean;     // Show to user?
    duration: number;     // Time spent thinking (ms)
  };

  // Token usage for this message
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

  // Response latency (ms)
  @Prop({ required: false })
  latency?: number;

  // Error information (if failed)
  @Prop({ required: false })
  error?: string;

  // Message status: 'sending', 'sent', 'delivered', 'failed'
  @Prop({
    required: false,
    enum: ['sending', 'sent', 'delivered', 'failed'],
    default: 'sent',
  })
  messageStatus?: string;

  // ✅ UPDATED: Attachments support file URLs and CBM document references
  @Prop({
    type: [
      {
        type: { type: String, required: true }, // 'file', 'document', 'image', 'video'
        url: { type: String, required: false }, // Direct file URL (S3, MinIO)
        documentId: { type: String, required: false }, // CBM document ID (document:<id>)
        filename: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: false }, // File size in bytes
        metadata: { type: Object, required: false }, // Extra metadata
      },
    ],
    required: false,
  })
  attachments?: Array<{
    type: 'file' | 'document' | 'image' | 'video';
    url?: string;           // Direct URL to file
    documentId?: string;    // CBM document ID (format: "document:<id>")
    filename: string;
    mimeType: string;
    size?: number;
    metadata?: Record<string, any>;
  }>;

  // Active status
  @Prop({ default: true })
  isActive: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for performance
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, role: 1 });
MessageSchema.index({ agentId: 1, createdAt: -1 });
MessageSchema.index({ parentMessageId: 1 });
MessageSchema.index({ messageType: 1 });
```

---

## 3. Context Field - Detailed Explanation

### 3.1. Mục đích của Context

**Context** là AI memory cho conversation, giúp:

1. **Conversation Summary**
   - Tóm tắt cuộc hội thoại khi quá dài
   - Optimize context window (giảm tokens)
   - Quick recap cho user khi quay lại sau nhiều ngày

2. **Entity Tracking**
   - Track các entities quan trọng (người, tổ chức, địa điểm)
   - Personalization trong responses
   - Liên kết conversations liên quan

3. **Topic Detection**
   - Phân loại conversation theo chủ đề
   - Search conversations by topic
   - Suggest related conversations

4. **Sentiment Analysis**
   - Đánh giá mức độ hài lòng của user
   - Ưu tiên support tickets
   - Alert khi sentiment negative

5. **Preferences & Facts**
   - Ghi nhớ sở thích user
   - Track decisions/commitments
   - Improve future responses

### 3.2. Cách Update Context

#### Auto-update sau mỗi N messages

```typescript
// services/aiwm/src/modules/conversation/conversation.service.ts
async updateContext(conversationId: string) {
  const conversation = await this.findById(conversationId);

  // Only update every 10 messages
  if (conversation.totalMessages % 10 !== 0) {
    return;
  }

  // Get recent messages
  const messages = await this.messageService.findByConversation(
    conversationId,
    { limit: 50, sort: '-createdAt' }
  );

  // Generate summary using AI
  const summary = await this.aiService.generateSummary(messages);

  // Extract entities
  const entities = await this.aiService.extractEntities(messages);

  // Detect topics
  const topics = await this.aiService.detectTopics(messages);

  // Analyze sentiment
  const sentiment = await this.aiService.analyzeSentiment(messages);

  // Update context
  await this.update(conversationId, {
    context: {
      summary,
      entities,
      topics,
      sentiment,
    },
  });
}
```

#### Manual trigger by user/agent

```typescript
// User clicks "Summarize conversation" button
@Post('conversations/:id/summarize')
async summarizeConversation(@Param('id') id: string) {
  return this.conversationService.updateContext(id);
}
```

### 3.3. Sử dụng Context trong Agent Responses

```typescript
// When agent responds, include context in prompt
const conversationContext = conversation.context;

const systemPrompt = `
You are an AI assistant. Here is the conversation context:

Summary: ${conversationContext.summary}
Topics: ${conversationContext.topics.join(', ')}
User preferences: ${JSON.stringify(conversationContext.preferences)}

Important facts:
${conversationContext.facts.join('\n')}

Use this context to provide more personalized and relevant responses.
`;

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: systemPrompt },
    ...recentMessages,
  ],
});
```

---

## 4. Sample Data Examples

### 4.1. Sample Conversation

```json
{
  "_id": "conv-abc123",
  "title": "Sales Data Analysis Request",
  "description": "",
  "agentId": "agent-analyst",
  "modelId": "model-gpt4",
  "conversationType": "chat",
  "status": "active",
  "totalTokens": 5420,
  "totalMessages": 12,
  "totalCost": 0.054,

  "participants": [
    {
      "type": "user",
      "id": "user-john-doe",
      "joined": "2025-01-15T10:00:00Z"
    },
    {
      "type": "agent",
      "id": "agent-analyst",
      "joined": "2025-01-15T10:00:00Z"
    }
  ],

  "lastMessage": {
    "content": "Here's the complete sales analysis report...",
    "role": "agent",
    "createdAt": "2025-01-15T10:15:00Z"
  },

  "tags": ["sales", "analysis", "q1-2025"],

  "context": {
    "summary": "User requested sales data analysis for Q1 2025. Agent fetched data from database, performed statistical analysis, and generated a comprehensive report showing 12.5% growth.",

    "entities": [
      { "type": "person", "value": "John Doe", "count": 3 },
      { "type": "organization", "value": "North Region Sales", "count": 5 },
      { "type": "date", "value": "Q1 2025", "count": 8 }
    ],

    "topics": ["sales", "data-analysis", "quarterly-report"],

    "sentiment": "positive",

    "preferences": {
      "reportFormat": "detailed",
      "includeCharts": true,
      "region": "North"
    },

    "facts": [
      "User manages North Region Sales",
      "Interested in comparative analysis with Q4 2024",
      "Prefers data visualizations over raw numbers"
    ]
  },

  "createdBy": "user-john-doe",
  "orgId": "org-acme",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:15:00Z"
}
```

### 4.2. Sample Messages with Attachments

#### Message 1: User with file attachment

```json
{
  "_id": "msg-001",
  "conversationId": "conv-abc123",
  "role": "user",
  "messageType": "text",
  "content": "Please analyze this sales report file",
  "attachments": [
    {
      "type": "file",
      "url": "https://s3.amazonaws.com/bucket/sales-q1.xlsx",
      "filename": "sales-q1.xlsx",
      "mimeType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "size": 45632,
      "metadata": {
        "uploadedAt": "2025-01-15T10:00:00Z"
      }
    }
  ],
  "createdBy": "user-john-doe",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

#### Message 2: Agent with CBM document reference

```json
{
  "_id": "msg-002",
  "conversationId": "conv-abc123",
  "role": "agent",
  "messageType": "text",
  "content": "I've created a detailed analysis report. You can view it in the document below.",
  "agentId": "agent-analyst",
  "attachments": [
    {
      "type": "document",
      "documentId": "document:doc-xyz789",
      "filename": "Sales Analysis Report - Q1 2025.pdf",
      "mimeType": "application/pdf",
      "size": 123456,
      "metadata": {
        "createdBy": "agent-analyst",
        "documentType": "report",
        "tags": ["sales", "q1-2025"]
      }
    }
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

#### Message 3: User with image attachment

```json
{
  "_id": "msg-003",
  "conversationId": "conv-xyz",
  "role": "user",
  "messageType": "text",
  "content": "What's in this image?",
  "attachments": [
    {
      "type": "image",
      "url": "https://cdn.example.com/images/chart.png",
      "filename": "chart.png",
      "mimeType": "image/png",
      "size": 89123,
      "metadata": {
        "width": 1920,
        "height": 1080
      }
    }
  ],
  "createdBy": "user-jane",
  "createdAt": "2025-01-15T11:00:00Z"
}
```

#### Message 4: Multiple attachments

```json
{
  "_id": "msg-004",
  "conversationId": "conv-multi",
  "role": "agent",
  "messageType": "text",
  "content": "Here are all the resources you requested:",
  "agentId": "agent-helper",
  "attachments": [
    {
      "type": "document",
      "documentId": "document:doc-001",
      "filename": "User Guide.pdf",
      "mimeType": "application/pdf"
    },
    {
      "type": "document",
      "documentId": "document:doc-002",
      "filename": "API Documentation.pdf",
      "mimeType": "application/pdf"
    },
    {
      "type": "file",
      "url": "https://s3.amazonaws.com/bucket/code-samples.zip",
      "filename": "code-samples.zip",
      "mimeType": "application/zip",
      "size": 234567
    }
  ],
  "createdAt": "2025-01-15T12:00:00Z"
}
```

---

## 5. Frontend Integration

### 5.1. Fetching Conversation with Participants

```typescript
// GET /conversations/:id
{
  "_id": "conv-abc123",
  "title": "Sales Analysis",
  "participants": [
    { "type": "user", "id": "user-john", "joined": "..." },
    { "type": "agent", "id": "agent-analyst", "joined": "..." }
  ],
  // ... other fields
}

// Frontend rendering
function ConversationHeader({ conversation }) {
  const users = conversation.participants.filter(p => p.type === 'user');
  const agents = conversation.participants.filter(p => p.type === 'agent');

  return (
    <div>
      <h2>{conversation.title}</h2>
      <div>
        Users: {users.map(u => u.id).join(', ')}
        Agents: {agents.map(a => a.id).join(', ')}
      </div>
    </div>
  );
}
```

### 5.2. Rendering Message Attachments

```typescript
function MessageAttachment({ attachment }) {
  // CBM document reference
  if (attachment.documentId) {
    return (
      <a href={`/documents/${attachment.documentId.replace('document:', '')}`}>
        📄 {attachment.filename}
      </a>
    );
  }

  // Direct file URL
  if (attachment.url) {
    if (attachment.type === 'image') {
      return <img src={attachment.url} alt={attachment.filename} />;
    }

    return (
      <a href={attachment.url} download>
        📎 {attachment.filename} ({formatSize(attachment.size)})
      </a>
    );
  }
}
```

### 5.3. Context Display

```typescript
function ConversationContext({ context }) {
  if (!context) return null;

  return (
    <div className="conversation-context">
      {context.summary && (
        <div>
          <strong>Summary:</strong>
          <p>{context.summary}</p>
        </div>
      )}

      {context.topics?.length > 0 && (
        <div>
          <strong>Topics:</strong>
          {context.topics.map(topic => (
            <Tag key={topic}>{topic}</Tag>
          ))}
        </div>
      )}

      {context.entities?.length > 0 && (
        <div>
          <strong>Key Entities:</strong>
          {context.entities.map(e => (
            <span key={e.value}>{e.value} ({e.count})</span>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 6. Migration Notes

### 6.1. Changes from Current Schema

**Conversation:**
- ❌ Removed `conversationId` (use MongoDB `_id`)
- ✅ Simplified `participants` structure
- ✅ Added `context` field explanation

**Message:**
- ✅ Changed `role: 'assistant'` → `role: 'agent'`
- ✅ Enhanced `attachments` to support CBM documents
- ✅ Added `messageType` for better rendering

### 6.2. Migration Script

```typescript
// scripts/migrate-conversations.ts
async function migrateConversations() {
  const conversations = await db.collection('conversations').find({});

  for (const conv of conversations) {
    // Remove conversationId field
    await db.collection('conversations').updateOne(
      { _id: conv._id },
      { $unset: { conversationId: '' } }
    );

    // Transform participants if needed
    if (conv.participants) {
      const newParticipants = conv.participants.map(p => ({
        type: p.role === 'agent' ? 'agent' : 'user',
        id: p.userId || p.agentId,
        joined: p.joinedAt,
      }));

      await db.collection('conversations').updateOne(
        { _id: conv._id },
        { $set: { participants: newParticipants } }
      );
    }
  }
}

async function migrateMessages() {
  // Change 'assistant' to 'agent'
  await db.collection('messages').updateMany(
    { role: 'assistant' },
    { $set: { role: 'agent' } }
  );
}
```

---

## Summary

### ✅ Conversation Schema
- No `conversationId` (use `_id`)
- Simplified `participants`: `{ type, id, joined }`
- `context` for AI memory and intelligence

### ✅ Message Schema
- `role`: 'user' | **'agent'** | 'system' | 'tool'
- `attachments`: Support file URLs + CBM `document:<id>`
- Full tool call/result tracking
- Agent thinking support

### ✅ Context Purpose
1. Conversation summary (optimize tokens)
2. Entity tracking (personalization)
3. Topic detection (search/categorize)
4. Sentiment analysis (support prioritization)
5. Preferences & facts (better responses)
