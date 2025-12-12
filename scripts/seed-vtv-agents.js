/**
 * Seed VTV-specific Guardrails and Agents
 * Run: mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-vtv-agents.js
 */

const ORG_ID = '691eba0851 7f917943ae1f9d';
const USER_ID = '691eba0851 7f917943ae1fa1';

print('========================================');
print('Seeding VTV Agents & Guardrails');
print('========================================');
print('');

// ============================================
// Step 1: Ensure we have a Node to assign agents
// ============================================
print('Step 1: Checking/Creating Node...');
print('');

let node = db.nodes.findOne({
  'owner.orgId': ORG_ID,
  isDeleted: false,
});

let nodeId;

if (!node) {
  const nodeDoc = {
    name: 'VTV Production Node 1',
    host: 'vtv-prod-node-01.local',
    port: 8080,
    status: 'active',
    capacity: 100,
    currentLoad: 0,
    tags: ['vtv', 'production'],
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

  const result = db.nodes.insertOne(nodeDoc);
  nodeId = result.insertedId.toString();
  print(`✅ Created Node: "${nodeDoc.name}" (${nodeId})`);
} else {
  nodeId = node._id.toString();
  print(`⏭️  Using existing Node: "${node.name}" (${nodeId})`);
}
print('');

// ============================================
// Step 2: Ensure we have Instructions
// ============================================
print('Step 2: Checking/Creating Instructions...');
print('');

const instructionsData = [
  {
    name: 'VTV Customer Support - General',
    description: 'Hướng dẫn cho chatbot hỗ trợ khách hàng VTV về chương trình, lịch phát sóng, và câu hỏi chung',
    content: `Bạn là trợ lý ảo của VTV (Đài Truyền hình Việt Nam). Nhiệm vụ của bạn là:

1. Trả lời câu hỏi về lịch phát sóng các chương trình VTV
2. Cung cấp thông tin về các kênh: VTV1, VTV2, VTV3, VTV4, VTV5, VTV6, VTV7, VTV8, VTV9
3. Hướng dẫn cách xem VTV online qua VTVgo
4. Giải đáp thắc mắc về nội dung chương trình

Lưu ý:
- Luôn lịch sự, thân thiện
- Sử dụng tiếng Việt
- Không bình luận về chính trị, tôn giáo
- Nếu không biết, hãy hướng dẫn liên hệ hotline: 1900 xxxx`,
    tags: ['vtv', 'customer-support', 'general'],
    status: 'active',
  },
  {
    name: 'VTV News Assistant',
    description: 'Trợ lý tin tức VTV - cung cấp thông tin tóm tắt về tin tức đã phát sóng',
    content: `Bạn là trợ lý tin tức của VTV. Nhiệm vụ:

1. Tóm tắt các tin tức đã phát sóng trên VTV
2. Cung cấp thông tin về thời sự, kinh tế, văn hóa, thể thao
3. Giải thích các thuật ngữ trong tin tức

Nguyên tắc:
- Trung lập, khách quan
- Chỉ cung cấp thông tin đã được VTV xác nhận
- KHÔNG bình luận chính trị
- KHÔNG đưa tin chưa kiểm chứng
- Sử dụng tiếng Việt chuẩn`,
    tags: ['vtv', 'news', 'information'],
    status: 'active',
  },
  {
    name: 'VTV Education Bot',
    description: 'Bot giáo dục VTV - hỗ trợ học sinh về nội dung các chương trình giáo dục',
    content: `Bạn là trợ lý giáo dục của VTV. Nhiệm vụ:

1. Hỗ trợ học sinh về nội dung chương trình VTV7 - Truyền hình Giáo dục
2. Giải đáp câu hỏi về bài học trên truyền hình
3. Hướng dẫn xem lại các bài giảng trên VTVgo

Nguyên tắc:
- Khuyến khích tư duy, không cho đáp án trực tiếp cho bài tập
- Giải thích dễ hiểu, phù hợp lứa tuổi học sinh
- Hướng dẫn nguồn học liệu chính thống
- Sử dụng tiếng Việt phù hợp với học sinh`,
    tags: ['vtv', 'education', 'vtv7'],
    status: 'active',
  },
];

const instructionIds = [];

instructionsData.forEach((instrData, index) => {
  const existing = db.instructions.findOne({
    'owner.orgId': ORG_ID,
    name: instrData.name,
    isDeleted: false,
  });

  if (existing) {
    instructionIds.push(existing._id.toString());
    print(`[${index + 1}] ⏭️  Using existing: "${instrData.name}"`);
  } else {
    const doc = {
      ...instrData,
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

    const result = db.instructions.insertOne(doc);
    instructionIds.push(result.insertedId.toString());
    print(`[${index + 1}] ✅ Created: "${instrData.name}"`);
  }
});
print('');

// ============================================
// Step 3: Create Guardrails
// ============================================
print('Step 3: Creating Guardrails...');
print('');

const guardrailsData = [
  {
    name: 'VTV Safe Content Filter',
    description: 'Bộ lọc nội dung an toàn cho các agent công khai của VTV',
    enabled: true,
    blockedKeywords: [
      'bạo lực', 'đánh nhau', 'giết người', 'vũ khí', 'súng', 'dao', 'bom',
      'hack', 'lừa đảo', 'hack', 'phá hoại',
      'ma túy', 'cocaine', 'heroin', 'cần sa', 'thuốc lá', 'rượu',
      'sex', 'tình dục', 'khiêu dâm', 'nude', 'xxx',
      'cờ bạc', 'casino', 'đánh bạc'
    ],
    blockedTopics: [
      'political', 'religious', 'adult', 'violence', 'hate-speech',
      'illegal-activities', 'gambling'
    ],
    customMessage: 'Xin lỗi, em không thể hỗ trợ yêu cầu này do vi phạm chính sách nội dung của VTV.',
    tags: ['vtv', 'public', 'strict'],
    status: 'active',
  },
  {
    name: 'VTV Education Content Filter',
    description: 'Bộ lọc cho bot giáo dục - cho phép nội dung học thuật',
    enabled: true,
    blockedKeywords: [
      'bạo lực', 'vũ khí', 'giết người',
      'hack', 'lừa đảo', 'phá hoại',
      'sex', 'tình dục', 'khiêu dâm', 'nude'
    ],
    blockedTopics: [
      'adult', 'violence', 'hate-speech', 'illegal-activities'
    ],
    customMessage: 'Nội dung này không phù hợp với mục đích giáo dục. Vui lòng hỏi câu hỏi khác.',
    tags: ['vtv', 'education', 'moderate'],
    status: 'active',
  },
  {
    name: 'VTV News Content Filter',
    description: 'Bộ lọc cho bot tin tức - cho phép thảo luận tin tức nhưng không bình luận chính trị',
    enabled: true,
    blockedKeywords: [
      'hack', 'lừa đảo', 'phá hoại',
      'sex', 'tình dục', 'khiêu dâm', 'nude', 'xxx'
    ],
    blockedTopics: [
      'adult', 'hate-speech', 'illegal-activities'
    ],
    customMessage: 'Em không thể thảo luận về chủ đề này. Vui lòng hỏi về tin tức đã được VTV phát sóng.',
    tags: ['vtv', 'news', 'moderate'],
    status: 'active',
  },
];

const guardrailIds = [];

guardrailsData.forEach((grData, index) => {
  const existing = db.guardrails.findOne({
    'owner.orgId': ORG_ID,
    name: grData.name,
    isDeleted: false,
  });

  if (existing) {
    guardrailIds.push(existing._id.toString());
    print(`[${index + 1}] ⏭️  Using existing: "${grData.name}"`);
  } else {
    const doc = {
      ...grData,
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

    const result = db.guardrails.insertOne(doc);
    guardrailIds.push(result.insertedId.toString());
    print(`[${index + 1}] ✅ Created: "${grData.name}"`);
    print(`   Blocked Keywords: ${grData.blockedKeywords.length} items`);
    print(`   Blocked Topics: ${grData.blockedTopics.length} items`);
  }
});
print('');

// ============================================
// Step 4: Create Agents
// ============================================
print('Step 4: Creating Agents...');
print('');

const agentsData = [
  {
    name: 'VTV Customer Support Agent',
    description: 'Agent hỗ trợ khách hàng VTV 24/7 - trả lời câu hỏi về chương trình, lịch phát sóng',
    status: 'active',
    instructionId: instructionIds[0], // VTV Customer Support - General
    guardrailId: guardrailIds[0],     // VTV Safe Content Filter
    nodeId: nodeId,
    tags: ['vtv', 'customer-support', 'production'],
  },
  {
    name: 'VTV News Bot',
    description: 'Bot tin tức VTV - cung cấp tóm tắt tin tức và thông tin đã phát sóng',
    status: 'active',
    instructionId: instructionIds[1], // VTV News Assistant
    guardrailId: guardrailIds[2],     // VTV News Content Filter
    nodeId: nodeId,
    tags: ['vtv', 'news', 'production'],
  },
  {
    name: 'VTV Education Assistant',
    description: 'Trợ lý giáo dục VTV7 - hỗ trợ học sinh về nội dung chương trình giáo dục',
    status: 'active',
    instructionId: instructionIds[2], // VTV Education Bot
    guardrailId: guardrailIds[1],     // VTV Education Content Filter
    nodeId: nodeId,
    tags: ['vtv', 'education', 'vtv7', 'production'],
  },
];

let agentsInserted = 0;
let agentsSkipped = 0;

agentsData.forEach((agentData, index) => {
  const existing = db.agents.findOne({
    'owner.orgId': ORG_ID,
    name: agentData.name,
    isDeleted: false,
  });

  if (existing) {
    print(`[${index + 1}] ⏭️  Skipped: "${agentData.name}" (already exists)`);
    agentsSkipped++;
  } else {
    const doc = {
      ...agentData,
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
    print(`[${index + 1}] ✅ Created: "${agentData.name}"`);
    print(`   Status: ${agentData.status}`);
    print(`   Instruction: ${instructionsData[index].name}`);
    print(`   Guardrail: ${guardrailsData[index === 0 ? 0 : index === 1 ? 2 : 1].name}`);
    print(`   Node: ${nodeId}`);
    print('');
    agentsInserted++;
  }
});

// ============================================
// Summary
// ============================================
print('========================================');
print('Summary');
print('========================================');
print(`Nodes: 1 ${node ? '(existing)' : '(created)'}`);
print(`Instructions: ${instructionsData.length} total`);
print(`Guardrails: ${guardrailsData.length} total`);
print(`Agents: ${agentsInserted} inserted, ${agentsSkipped} skipped`);
print('');

// ============================================
// Verification
// ============================================
print('========================================');
print('Verification');
print('========================================');

const totalAgents = db.agents.countDocuments({
  'owner.orgId': ORG_ID,
  isDeleted: false,
});
print(`Total Agents: ${totalAgents}`);

const agentsByStatus = db.agents
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
  ])
  .toArray();

print('Agents by Status:');
agentsByStatus.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count}`);
});
print('');

print('========================================');
print('✅ Complete!');
print('========================================');
print('');
print('Quick Queries:');
print('');
print('# List all VTV agents:');
print("db.agents.find({ 'owner.orgId': '" + ORG_ID + "', tags: 'vtv', isDeleted: false }).pretty();");
print('');
print('# Agent with guardrail info:');
print(`db.agents.aggregate([
  { $match: { 'owner.orgId': '${ORG_ID}', isDeleted: false } },
  { $lookup: { from: 'guardrails', localField: 'guardrailId', foreignField: '_id', as: 'guardrail' } },
  { $lookup: { from: 'instructions', localField: 'instructionId', foreignField: '_id', as: 'instruction' } }
]).pretty();`);
print('');
print('# Test Agent API:');
print('curl -X GET http://localhost:3003/agents -H "Authorization: Bearer YOUR_TOKEN"');
print('');
