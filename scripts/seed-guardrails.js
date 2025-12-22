/**
 * Seed Guardrail templates to database
 * Run: mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-guardrails.js
 */

const ORG_ID = '691eba0851 7f917943ae1f9d';
const USER_ID = '691eba0851 7f917943ae1fa1';

print('========================================');
print('Seeding Guardrail Templates');
print('========================================');
print('');

const guardrails = [
  // VTV specific guardrails
  {
    name: 'VTV Safe Content Filter',
    description: 'Standard content filter for VTV public-facing agents. Blocks violence, politics, and adult content.',
    enabled: true,
    blockedKeywords: [
      'violence', 'weapon', 'gun', 'bomb', 'kill', 'murder',
      'hack', 'illegal', 'drug', 'alcohol', 'gambling',
      'sex', 'porn', 'adult', 'nude'
    ],
    blockedTopics: [
      'political', 'religious', 'adult', 'violence', 'hate-speech'
    ],
    customMessage: 'Xin lỗi, em không thể hỗ trợ yêu cầu này do vi phạm chính sách nội dung của VTV.',
    tags: ['vtv', 'public', 'strict', 'vietnamese'],
    status: 'active',
  },

  // VTV Education specific
  {
    name: 'VTV Education Content Filter',
    description: 'Content filter for VTV educational agents. More permissive for learning topics.',
    enabled: true,
    blockedKeywords: [
      'violence', 'weapon', 'hack', 'illegal',
      'sex', 'porn', 'adult', 'nude'
    ],
    blockedTopics: [
      'adult', 'violence', 'hate-speech'
    ],
    customMessage: 'Nội dung này không phù hợp với mục đích giáo dục. Vui lòng hỏi câu hỏi khác.',
    tags: ['vtv', 'education', 'moderate', 'vietnamese'],
    status: 'active',
  },

  // VTV Internal use
  {
    name: 'VTV Internal Moderate Filter',
    description: 'Moderate filter for VTV internal agents used by staff members.',
    enabled: true,
    blockedKeywords: [
      'hack', 'illegal', 'sex', 'porn', 'nude'
    ],
    blockedTopics: [
      'adult', 'hate-speech'
    ],
    customMessage: 'Nội dung này không được phép theo chính sách bảo mật của VTV.',
    tags: ['vtv', 'internal', 'moderate', 'vietnamese'],
    status: 'active',
  },

  // Generic strict filter
  {
    name: 'Strict Content Filter (Global)',
    description: 'Strict content filter for general public-facing agents. Suitable for any organization.',
    enabled: true,
    blockedKeywords: [
      'violence', 'weapon', 'gun', 'knife', 'bomb', 'kill', 'murder', 'terrorism',
      'hack', 'exploit', 'malware', 'virus', 'crack', 'piracy',
      'illegal', 'drug', 'cocaine', 'heroin', 'marijuana',
      'sex', 'porn', 'adult', 'nude', 'xxx', 'erotic',
      'gambling', 'casino', 'bet', 'poker',
      'hate', 'racist', 'discrimination'
    ],
    blockedTopics: [
      'political', 'religious', 'adult', 'violence', 'hate-speech',
      'illegal-activities', 'gambling', 'terrorism'
    ],
    customMessage: 'I cannot assist with that request due to content restrictions.',
    tags: ['global', 'public', 'strict', 'general'],
    status: 'active',
  },

  // Minimal filter for internal tools
  {
    name: 'Minimal Filter (Development)',
    description: 'Minimal filter for development and testing purposes. Only blocks explicit adult content.',
    enabled: true,
    blockedKeywords: [
      'porn', 'nude', 'xxx', 'sex'
    ],
    blockedTopics: [
      'adult'
    ],
    customMessage: 'Content not appropriate for this agent.',
    tags: ['development', 'internal', 'minimal', 'testing'],
    status: 'active',
  },

  // Healthcare specific
  {
    name: 'Healthcare Content Filter',
    description: 'Content filter for healthcare agents. Blocks violence and adult content but allows medical topics.',
    enabled: true,
    blockedKeywords: [
      'violence', 'weapon', 'kill', 'murder',
      'hack', 'illegal',
      'sex', 'porn', 'adult', 'nude'
    ],
    blockedTopics: [
      'violence', 'adult', 'hate-speech', 'illegal-activities'
    ],
    customMessage: 'I cannot provide information on that topic. Please consult with a healthcare professional.',
    tags: ['healthcare', 'medical', 'moderate', 'hipaa'],
    status: 'active',
  },

  // Financial services
  {
    name: 'Financial Services Filter',
    description: 'Content filter for financial/banking agents. Blocks scams, fraud, and adult content.',
    enabled: true,
    blockedKeywords: [
      'scam', 'fraud', 'phishing', 'hack', 'steal',
      'illegal', 'money-laundering', 'terrorism',
      'sex', 'porn', 'adult', 'nude', 'gambling'
    ],
    blockedTopics: [
      'adult', 'violence', 'hate-speech', 'illegal-activities', 'gambling'
    ],
    customMessage: 'I cannot assist with that request. Please contact customer support for sensitive financial matters.',
    tags: ['finance', 'banking', 'strict', 'pci-dss'],
    status: 'active',
  },
];

print('Inserting Guardrail templates...');
print('');

let inserted = 0;
let skipped = 0;

guardrails.forEach((guardrail, index) => {
  // Check if guardrail already exists
  const existing = db.guardrails.findOne({
    'owner.orgId': ORG_ID,
    name: guardrail.name,
    isDeleted: false,
  });

  if (existing) {
    print(`[${index + 1}] ⏭️  Skipped: "${guardrail.name}" (already exists)`);
    skipped++;
  } else {
    const doc = {
      ...guardrail,
      owner: {
        userId: USER_ID,
        orgId: ORG_ID,
      },
      createdBy: USER_ID,
      updatedBy: USER_ID,
      isDeleted: false,
      metadata: {},
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = db.guardrails.insertOne(doc);
    if (result.acknowledged) {
      print(`[${index + 1}] ✅ Created: "${guardrail.name}"`);
      print(`   Status: ${guardrail.status}`);
      print(`   Blocked Keywords: ${guardrail.blockedKeywords.length} items`);
      print(`   Blocked Topics: ${guardrail.blockedTopics.length} items`);
      print(`   Tags: ${guardrail.tags.join(', ')}`);
      print('');
      inserted++;
    }
  }
});

print('========================================');
print('Summary');
print('========================================');
print(`✅ Inserted: ${inserted} guardrails`);
print(`⏭️  Skipped: ${skipped} guardrails`);
print(`📊 Total: ${guardrails.length} guardrails`);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');

const total = db.guardrails.countDocuments({
  'owner.orgId': ORG_ID,
  isDeleted: false,
});
print(`Total Guardrails in database: ${total}`);
print('');

// Statistics by status
const statusStats = db.guardrails
  .aggregate([
    {
      $match: {
        'owner.orgId': ORG_ID,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ])
  .toArray();

print('Guardrails by Status:');
statusStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} guardrail(s)`);
});
print('');

// Statistics by tags
const tagStats = db.guardrails
  .aggregate([
    {
      $match: {
        'owner.orgId': ORG_ID,
        isDeleted: false,
      },
    },
    { $unwind: '$tags' },
    {
      $group: {
        _id: '$tags',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ])
  .toArray();

print('Guardrails by Tag:');
tagStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} guardrail(s)`);
});
print('');

print('========================================');
print('✅ Complete!');
print('========================================');
print('');
print('Quick Queries:');
print('');
print('# List all active guardrails:');
print("db.guardrails.find({ 'owner.orgId': '" + ORG_ID + "', status: 'active', isDeleted: false }).pretty();");
print('');
print('# List VTV guardrails:');
print("db.guardrails.find({ 'owner.orgId': '" + ORG_ID + "', tags: 'vtv', isDeleted: false }).pretty();");
print('');
print('# Test Guardrail API:');
print('curl -X GET http://localhost:3003/guardrails -H "Authorization: Bearer YOUR_TOKEN"');
print('');
