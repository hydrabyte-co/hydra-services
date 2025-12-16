/**
 * Seed sample agents with guardrails configuration
 * Run: mongosh mongodb://172.16.3.20:27017/hydra-aiwm scripts/seed-agents-with-guardrails.js
 */

const ORG_ID = '691eba0851 7f917943ae1f9d';
const USER_ID = '691eba0851 7f917943ae1fa1';

// Note: Replace these with actual IDs from your database
const NODE_ID = 'node-gpu-001'; // Replace with actual node ID
const INSTRUCTION_ID = null; // Optional

print('========================================');
print('Seeding Agents with Guardrails');
print('========================================');
print('');

const agents = [
  // 1. VTV Customer Support - Strict guardrails
  {
    agentId: 'agent-vtv-cs-001',
    name: 'VTV Customer Support Agent',
    description: 'AI agent for VTV customer support with strict content filtering',
    role: 'Customer Support',
    status: 'active',
    capabilities: ['chat', 'search', 'email'],
    configuration: {
      modelId: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
      timeout: 30,
      maxRetries: 3,
    },
    instructionId: INSTRUCTION_ID,
    nodeId: NODE_ID,
    permissions: ['read:docs', 'write:logs'],
    tags: ['production', 'vtv', 'customer-support'],
    guardrails: {
      enabled: true,
      blockedKeywords: ['hack', 'violence', 'illegal', 'weapon', 'drug'],
      blockedTopics: ['political', 'religious', 'adult'],
      customMessage: 'Xin lỗi, em không thể hỗ trợ yêu cầu này theo chính sách của VTV.',
    },
  },

  // 2. VTV Content Writer - Moderate guardrails
  {
    agentId: 'agent-vtv-writer-001',
    name: 'VTV Content Writing Assistant',
    description: 'AI assistant for VTV journalists and content creators',
    role: 'Content Writer',
    status: 'active',
    capabilities: ['writing', 'research', 'editing'],
    configuration: {
      modelId: 'gpt-4',
      maxTokens: 3000,
      temperature: 0.8,
      timeout: 60,
      maxRetries: 2,
    },
    instructionId: INSTRUCTION_ID,
    nodeId: NODE_ID,
    permissions: ['read:docs', 'write:content'],
    tags: ['production', 'vtv', 'content-creation'],
    guardrails: {
      enabled: true,
      blockedKeywords: ['fake news', 'propaganda', 'misinformation'],
      blockedTopics: ['political conspiracy', 'hate speech'],
      customMessage: 'Nội dung này không phù hợp với tiêu chuẩn biên tập của VTV.',
    },
  },

  // 3. General Assistant - Minimal guardrails
  {
    agentId: 'agent-general-001',
    name: 'General Purpose Assistant',
    description: 'General AI assistant with basic content filtering',
    role: 'General Assistant',
    status: 'active',
    capabilities: ['chat', 'research', 'coding'],
    configuration: {
      modelId: 'gpt-3.5-turbo',
      maxTokens: 1500,
      temperature: 0.7,
      timeout: 20,
      maxRetries: 3,
    },
    instructionId: INSTRUCTION_ID,
    nodeId: NODE_ID,
    permissions: ['read:docs'],
    tags: ['development', 'general'],
    guardrails: {
      enabled: true,
      blockedKeywords: ['illegal', 'harmful'],
      blockedTopics: [],
      customMessage: 'I cannot assist with that request.',
    },
  },

  // 4. Technical Support - No guardrails (trusted internal use)
  {
    agentId: 'agent-tech-support-001',
    name: 'Technical Support Agent',
    description: 'Internal technical support agent without content restrictions',
    role: 'Technical Support',
    status: 'active',
    capabilities: ['troubleshooting', 'system-access', 'debugging'],
    configuration: {
      modelId: 'gpt-4',
      maxTokens: 2500,
      temperature: 0.5,
      timeout: 45,
      maxRetries: 5,
    },
    instructionId: INSTRUCTION_ID,
    nodeId: NODE_ID,
    permissions: ['read:docs', 'write:logs', 'system:admin'],
    tags: ['internal', 'technical', 'trusted'],
    guardrails: {
      enabled: false, // No restrictions for internal technical use
    },
  },

  // 5. Education Bot - Educational content guardrails
  {
    agentId: 'agent-edu-001',
    name: 'Educational Assistant',
    description: 'AI tutor for students with age-appropriate content filtering',
    role: 'Education',
    status: 'active',
    capabilities: ['tutoring', 'explanation', 'quiz'],
    configuration: {
      modelId: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.6,
      timeout: 30,
      maxRetries: 3,
    },
    instructionId: INSTRUCTION_ID,
    nodeId: NODE_ID,
    permissions: ['read:docs'],
    tags: ['education', 'students', 'safe'],
    guardrails: {
      enabled: true,
      blockedKeywords: ['adult', 'violence', 'drug', 'weapon', 'gambling'],
      blockedTopics: ['adult content', 'violence', 'illegal activities'],
      customMessage: 'This content is not appropriate for educational purposes.',
    },
  },
];

print('Inserting agents with guardrails...');
print('');

let inserted = 0;
let skipped = 0;

agents.forEach((agent, index) => {
  // Check if agent already exists
  const existing = db.agents.findOne({
    'owner.orgId': ORG_ID,
    agentId: agent.agentId,
    isDeleted: false,
  });

  if (existing) {
    print(`[${index + 1}] ⏭️  Skipped: "${agent.name}" (agentId: ${agent.agentId} already exists)`);
    skipped++;
  } else {
    const doc = {
      ...agent,
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageResponseTime: 0,
      averageLatency: 0,
      lastTask: null,
      lastHeartbeat: new Date(),
      isActive: true,
      owner: {
        userId: USER_ID,
        orgId: ORG_ID,
      },
      createdBy: USER_ID,
      updatedBy: USER_ID,
      deletedAt: null,
      metadata: {},
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = db.agents.insertOne(doc);
    if (result.acknowledged) {
      print(`[${index + 1}] ✅ Created: "${agent.name}"`);
      print(`   Agent ID: ${agent.agentId}`);
      print(`   Role: ${agent.role}`);
      print(`   Guardrails Enabled: ${agent.guardrails?.enabled || false}`);
      if (agent.guardrails?.enabled) {
        print(`   Blocked Keywords: ${agent.guardrails.blockedKeywords?.length || 0}`);
        print(`   Blocked Topics: ${agent.guardrails.blockedTopics?.length || 0}`);
      }
      print('');
      inserted++;
    }
  }
});

print('========================================');
print('Summary');
print('========================================');
print(`✅ Inserted: ${inserted} agents`);
print(`⏭️  Skipped: ${skipped} agents`);
print(`📊 Total: ${agents.length} agents`);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');

const total = db.agents.countDocuments({
  'owner.orgId': ORG_ID,
  isDeleted: false,
});
print(`Total agents in database: ${total}`);
print('');

// Statistics by guardrails status
const guardrailStats = db.agents
  .aggregate([
    {
      $match: {
        'owner.orgId': ORG_ID,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: {
          $cond: [{ $ifNull: ['$guardrails.enabled', false] }, 'enabled', 'disabled'],
        },
        count: { $sum: 1 },
      },
    },
  ])
  .toArray();

print('Agents by Guardrails Status:');
guardrailStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} agent(s)`);
});
print('');

// List agents with guardrails
const agentsWithGuardrails = db.agents
  .find({
    'owner.orgId': ORG_ID,
    'guardrails.enabled': true,
    isDeleted: false,
  })
  .toArray();

print('Agents with Active Guardrails:');
agentsWithGuardrails.forEach((agent, i) => {
  print(`${i + 1}. ${agent.name} (${agent.agentId})`);
  print(`   Keywords: ${agent.guardrails.blockedKeywords?.join(', ') || 'none'}`);
  print(`   Topics: ${agent.guardrails.blockedTopics?.join(', ') || 'none'}`);
  print('');
});

print('========================================');
print('✅ Complete!');
print('========================================');
print('');
print('Quick Queries:');
print('');
print('# List all agents with guardrails:');
print("db.agents.find({ 'owner.orgId': '" + ORG_ID + "', 'guardrails.enabled': true, isDeleted: false }).pretty();");
print('');
print('# Test agent API:');
print('curl -X GET http://localhost:3003/agents -H "Authorization: Bearer YOUR_TOKEN"');
print('');
print('⚠️  Note: Remember to update NODE_ID in this script with actual node ID from your database');
print('');
