/**
 * Seed Example Models to MongoDB
 * Data sourced from official HuggingFace model pages
 *
 * Usage:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-example-models.js
 *
 * Or:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm
 *   > load('scripts/seed-example-models.js')
 */

const ORG_ID = ObjectId('692ff5fa3371dad36b287ec5');
const USER_ID = ObjectId('692ff5fa3371dad36b287ec4'); // Assume user ID exists

// Helper function to create base schema fields
function createBaseFields(userId, orgId) {
  return {
    owner: {
      userId: userId,
      orgId: orgId
    },
    createdBy: userId,
    updatedBy: userId,
    deletedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Example Models Data (Real information from HuggingFace)
const models = [
  // 1. YOLOv8 - Vision Model (Object Detection)
  {
    name: 'YOLOv8',
    type: 'vision',
    description: 'YOLOv8 is a cutting-edge, state-of-the-art (SOTA) model for computer vision tasks including object detection, instance segmentation, image classification, pose estimation, and oriented bounding box (OBB) detection. The framework builds on previous YOLO iterations with enhanced performance and adaptability. Pretrained on COCO dataset (80 classes) and ImageNet (1000 classes). Available in 5 sizes from Nano (3.2M params) to Extra-large (68.2M params).',
    deploymentType: 'self-hosted',
    status: 'queued',
    repository: 'Ultralytics/YOLOv8',
    framework: 'triton',
    fileName: 'yolov8n.pt', // Nano version
    fileSize: 6246144, // ~6MB for nano version
    downloadPath: null, // Will be set after download
    nodeId: null, // Will be assigned when deployed
    scope: 'public',
    ...createBaseFields(USER_ID, ORG_ID)
  },

  // 2. Qwen2.5-7B - LLM (Large Language Model)
  {
    name: 'Qwen2.5-7B',
    type: 'llm',
    description: 'Qwen2.5-7B is a 7.61 billion parameter causal language model from Alibaba Cloud, representing the latest iteration of the Qwen LLM series. Offers significantly enhanced capabilities in coding, mathematics, instruction adherence, and generating lengthy texts (8K+ tokens). Supports 128K context length and over 29 languages including Chinese, English, French, Spanish, Portuguese, German, Italian, Russian, Japanese, Korean, Vietnamese, Thai, and Arabic. Features transformer architecture with RoPE, SwiGLU, RMSNorm, and grouped query attention (28 layers, 28 query heads, 4 key-value heads). Designed for continued pretraining, supervised fine-tuning (SFT), and RLHF.',
    deploymentType: 'self-hosted',
    status: 'queued',
    repository: 'Qwen/Qwen2.5-7B',
    framework: 'vllm',
    fileName: 'model.safetensors',
    fileSize: 8589934592, // ~8GB in BF16
    downloadPath: null,
    nodeId: null,
    scope: 'public',
    ...createBaseFields(USER_ID, ORG_ID)
  },

  // 3. Whisper Large V3 - Voice Model (Speech-to-Text)
  {
    name: 'Whisper-Large-v3',
    type: 'voice',
    description: 'Whisper Large-v3 by OpenAI is an automatic speech recognition (ASR) and speech translation model with 1.55 billion parameters. Trained on 5 million hours of labeled audio data, it demonstrates strong zero-shot generalization across many datasets and domains. Supports 99 languages with particularly strong performance in approximately 10 languages. Capable of speech transcription (audio to text in source language), speech translation (audio to English), and timestamp generation (sentence-level and word-level). Shows 10-20% error reduction compared to Large-v2. Uses transformer-based encoder-decoder architecture with 128 Mel frequency bins for spectrogram input. Compatible with PyTorch, JAX, Safetensors, Flash Attention 2, and torch.compile.',
    deploymentType: 'self-hosted',
    status: 'queued',
    repository: 'openai/whisper-large-v3',
    framework: 'triton',
    fileName: 'model.safetensors',
    fileSize: 2147483648, // ~2GB
    downloadPath: null,
    nodeId: null,
    scope: 'public',
    ...createBaseFields(USER_ID, ORG_ID)
  },

  // 4. Qwen3-30B-A3B - LLM (Mixture-of-Experts)
  {
    name: 'Qwen3-30B-A3B',
    type: 'llm',
    description: 'Qwen3-30B-A3B is a mixture-of-experts language model with 30.5B total parameters (3.3B activated, 29.9B non-embedding). Released in 2025, it uniquely supports seamless switching between thinking mode (for complex logical reasoning) and non-thinking mode (for efficient dialogue) within a single model. Features 48 layers with 128 experts (8 activated) using grouped query attention (GQA). Excels in reasoning, instruction-following, agent capabilities, and multilingual support across 100+ languages and dialects. Supports native context of 32,768 tokens and extended context of 131,072 tokens using YaRN scaling. Offers hard switch (enable_thinking=False) and soft switch (/think, /no_think tags) for mode control. Compatible with transformers, vLLM, SGLang, and other inference frameworks.',
    deploymentType: 'self-hosted',
    status: 'queued',
    repository: 'Qwen/Qwen3-30B-A3B',
    framework: 'vllm',
    fileName: 'model.safetensors',
    fileSize: 33285996544, // ~31GB in BF16
    downloadPath: null,
    nodeId: null,
    scope: 'public',
    ...createBaseFields(USER_ID, ORG_ID)
  },

  // 5. VBD-LLaMA2-7B-50B-Chat - LLM (Vietnamese Fine-tuned)
  {
    name: 'VBD-LLaMA2-7B-50B-Chat',
    type: 'llm',
    description: 'VBD-LLaMA2-7B-50B-Chat is a 7 billion parameter conversational model that adapts Meta\'s LLaMA2-7B for Vietnamese through continued pretraining and supervised fine-tuning. Developed by LR-AI-Labs, it gives helpful, detailed, and polite answers in conversational contexts, particularly excelling at multi-turn dialogue scenarios. Trained on 100 billion Vietnamese tokens + 40 billion English tokens during pretraining, and fine-tuned on 2 million Vietnamese conversational samples. Extended the original LLaMA2 vocabulary with Vietnamese syllables and incorporated knowledge transfer between English and Vietnamese latent spaces. Retains English capabilities while specializing in Vietnamese multi-turn conversations, single-turn QA, email composition, and retrieval-augmented generation applications.',
    deploymentType: 'self-hosted',
    status: 'queued',
    repository: 'LR-AI-Labs/vbd-llama2-7B-50b-chat',
    framework: 'vllm',
    fileName: 'model.safetensors',
    fileSize: 7516192768, // ~7GB in BF16
    downloadPath: null,
    nodeId: null,
    scope: 'public',
    ...createBaseFields(USER_ID, ORG_ID)
  }
];

// Insert models into MongoDB
print('========================================');
print('Seeding Example Models to MongoDB');
print('========================================');
print(`Database: ${db.getName()}`);
print(`Target Organization: ${ORG_ID}`);
print(`Models to insert: ${models.length}`);
print('');

// Check if models collection exists
const collections = db.getCollectionNames();
if (!collections.includes('models')) {
  print('⚠️  Warning: "models" collection does not exist yet.');
  print('   It will be created automatically on first insert.');
  print('');
}

// Optional: Clear existing example models for this org
// Uncomment the following lines if you want to replace existing models
/*
print('Clearing existing models for this organization...');
const deleteResult = db.models.deleteMany({ 'owner.orgId': ORG_ID });
print(`Cleared ${deleteResult.deletedCount} existing models.`);
print('');
*/

// Insert models
let successCount = 0;
let errorCount = 0;
const insertedIds = [];

models.forEach((model, index) => {
  try {
    const result = db.models.insertOne(model);

    if (result.acknowledged) {
      successCount++;
      insertedIds.push(result.insertedId);
      print(`✅ [${index + 1}/${models.length}] Inserted: ${model.name}`);
      print(`   Type: ${model.type} | Framework: ${model.framework || 'N/A'}`);
      print(`   Repository: ${model.repository}`);
      print(`   File Size: ${(model.fileSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
      print(`   ID: ${result.insertedId}`);
    } else {
      errorCount++;
      print(`❌ [${index + 1}/${models.length}] Failed to insert: ${model.name}`);
    }
  } catch (error) {
    errorCount++;
    print(`❌ [${index + 1}/${models.length}] Error inserting ${model.name}: ${error.message}`);
  }
  print('');
});

print('========================================');
print('Seeding Summary');
print('========================================');
print(`✅ Success: ${successCount}`);
print(`❌ Errors: ${errorCount}`);
print(`📊 Total: ${models.length}`);
print('');

// Verify inserted models
print('========================================');
print('Verification');
print('========================================');
const count = db.models.countDocuments({ 'owner.orgId': ORG_ID });
print(`Total models for organization ${ORG_ID}: ${count}`);
print('');

// Display inserted models
print('Models by Type:');
const byType = db.models.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  { $group: { _id: '$type', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

byType.forEach(item => {
  print(`  - ${item._id}: ${item.count}`);
});
print('');

print('Models by Framework:');
const byFramework = db.models.aggregate([
  { $match: { 'owner.orgId': ORG_ID, framework: { $exists: true } } },
  { $group: { _id: '$framework', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

byFramework.forEach(item => {
  print(`  - ${item._id}: ${item.count}`);
});
print('');

print('Models by Status:');
const byStatus = db.models.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  { $group: { _id: '$status', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

byStatus.forEach(item => {
  print(`  - ${item._id}: ${item.count}`);
});
print('');

print('Total File Size:');
const totalSize = db.models.aggregate([
  { $match: { 'owner.orgId': ORG_ID, fileSize: { $exists: true } } },
  { $group: { _id: null, totalBytes: { $sum: '$fileSize' } } }
]).toArray();

if (totalSize.length > 0) {
  const totalGB = totalSize[0].totalBytes / 1024 / 1024 / 1024;
  print(`  Total: ${totalGB.toFixed(2)} GB`);
}
print('');

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Inserted Model IDs:');
insertedIds.forEach((id, index) => {
  print(`  ${index + 1}. ${id}`);
});
print('');
print('Quick Query Examples:');
print('');
print('// List all models for this org');
print(`db.models.find({ 'owner.orgId': ObjectId('${ORG_ID}') }).pretty();`);
print('');
print('// List LLM models');
print(`db.models.find({ 'owner.orgId': ObjectId('${ORG_ID}'), type: 'llm' }).pretty();`);
print('');
print('// List models by framework');
print(`db.models.find({ 'owner.orgId': ObjectId('${ORG_ID}'), framework: 'vllm' }).pretty();`);
print('');
print('// Get total size by type');
print(`db.models.aggregate([
  { $match: { 'owner.orgId': ObjectId('${ORG_ID}') } },
  { $group: { _id: '$type', totalSize: { $sum: '$fileSize' }, count: { $sum: 1 } } }
]);`);
print('');
print('// Find model by repository');
print(`db.models.findOne({ repository: 'Qwen/Qwen2.5-7B' });`);
