/**
 * Seed Example Resources to MongoDB
 * Based on actual running Docker containers
 *
 * Usage:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-example-resources.js
 */

const ORG_ID = ObjectId('692ff5fa3371dad36b287ec5');
const USER_ID = ObjectId('692ff5fa3371dad36b287ec4');

// Helper function to create base schema fields
function createBaseFields(userId, orgId, labels = {}) {
  return {
    owner: {
      userId: userId,
      orgId: orgId,
      groupId: '',
      agentId: '',
      appId: ''
    },
    createdBy: userId,
    updatedBy: userId,
    deletedAt: null,
    isDeleted: false,
    metadata: {
      labels: labels
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

print('========================================');
print('Seeding Example Resources');
print('========================================');

// Step 1: Create or find a node
print('\nStep 1: Checking for existing node...');

let node = db.nodes.findOne({
  'owner.orgId': ORG_ID,
  name: 'local-worker-01'
});

if (!node) {
  print('No existing node found. Creating new node...');

  const nodeData = {
    name: 'local-worker-01',
    role: ['worker', 'storage'],
    status: 'online',
    isLocal: true,
    websocketConnected: true,
    lastHeartbeat: new Date(),
    gpuDevices: [
      {
        deviceId: 'GPU-0',
        model: 'NVIDIA RTX 4090',
        memoryTotal: 24576,
        memoryFree: 12288,
        utilization: 45,
        temperature: 65
      }
    ],
    cpuCores: 16,
    cpuModel: 'Intel Core i9-13900K',
    ramTotal: 65536,
    ramFree: 32768,
    diskTotal: 2048000,
    hostname: 'localhost',
    ipAddress: '127.0.0.1',
    os: 'Ubuntu 22.04',
    daemonVersion: '1.0.0',
    containerRuntime: 'Docker 24.0.7',
    uptimeSeconds: 2764800,
    cpuUsage: 35,
    ramUsage: 32768,
    lastMetricsAt: new Date(),
    ...createBaseFields(USER_ID, ORG_ID)
  };

  const nodeResult = db.nodes.insertOne(nodeData);
  if (nodeResult.acknowledged) {
    node = db.nodes.findOne({ _id: nodeResult.insertedId });
    print(`✅ Created node: ${node.name} (${nodeResult.insertedId})`);
  } else {
    print('❌ Failed to create node');
    quit(1);
  }
} else {
  print(`✅ Found existing node: ${node.name} (${node._id})`);
}

const NODE_ID = node._id;
print('');

// Step 2: Get Model IDs for inference containers
print('Step 2: Getting model IDs...');

const modelQwen25 = db.models.findOne({ repository: 'Qwen/Qwen2.5-7B', 'owner.orgId': ORG_ID });
const modelVBD = db.models.findOne({ repository: 'LR-AI-Labs/vbd-llama2-7B-50b-chat', 'owner.orgId': ORG_ID });
const modelYOLO = db.models.findOne({ repository: 'Ultralytics/YOLOv8', 'owner.orgId': ORG_ID });
const modelWhisper = db.models.findOne({ repository: 'openai/whisper-large-v3', 'owner.orgId': ORG_ID });

if (!modelQwen25 || !modelVBD || !modelYOLO || !modelWhisper) {
  print('⚠️  Warning: Some models not found. Please run seed-example-models.js first.');
  print(`   Qwen2.5-7B: ${modelQwen25 ? 'Found' : 'Not found'}`);
  print(`   VBD-LLaMA2: ${modelVBD ? 'Found' : 'Not found'}`);
  print(`   YOLOv8: ${modelYOLO ? 'Found' : 'Not found'}`);
  print(`   Whisper: ${modelWhisper ? 'Found' : 'Not found'}`);
  print('');
}

print('✅ Model IDs retrieved');
print('');

// Step 3: Create Resources
print('Step 3: Creating resources...');
print('');

// Resources data based on docker ps output
const resources = [
  // System Containers (label: aio-system)
  {
    name: 'MongoDB',
    description: 'MongoDB 6.0 database for AIWM system storage',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running', // Running but unhealthy according to docker ps
    config: {
      type: 'application-container',
      registry: 'docker-hub',
      imageName: 'mongo',
      imageTag: '6.0',
      containerPorts: [
        { containerPort: 27017, hostPort: 27017, protocol: 'tcp' }
      ],
      cpuCores: 2,
      ramLimit: 4,
      volumes: [
        { hostPath: '/data/mongodb', containerPath: '/data/db', readOnly: false }
      ],
      environment: {
        MONGO_INITDB_DATABASE: 'core_aiwm'
      },
      networkMode: 'bridge'
    },
    runtime: {
      id: 'd19ffb052449',
      endpoint: '127.0.0.1:27017',
      allocatedCPU: 2,
      allocatedRAM: 4,
      startedAt: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000) // 6 weeks ago
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-system': 'true' })
  },

  {
    name: 'PostgreSQL',
    description: 'PostgreSQL 15 database for AIWM system metadata',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'application-container',
      registry: 'docker-hub',
      imageName: 'postgres',
      imageTag: '15-alpine',
      containerPorts: [
        { containerPort: 5432, hostPort: 5432, protocol: 'tcp' }
      ],
      cpuCores: 2,
      ramLimit: 4,
      volumes: [
        { hostPath: '/data/postgres', containerPath: '/var/lib/postgresql/data', readOnly: false }
      ],
      environment: {
        POSTGRES_USER: 'admin',
        POSTGRES_DB: 'aiwm'
      },
      networkMode: 'bridge'
    },
    runtime: {
      id: 'f5467ecbab98',
      endpoint: '127.0.0.1:5432',
      allocatedCPU: 2,
      allocatedRAM: 4,
      startedAt: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-system': 'true' })
  },

  {
    name: 'MinIO Storage',
    description: 'MinIO object storage for model files and artifacts',
    resourceType: 'application-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'application-container',
      registry: 'docker-hub',
      imageName: 'minio/minio',
      imageTag: 'latest',
      containerPorts: [
        { containerPort: 9000, hostPort: 9000, protocol: 'tcp' },
        { containerPort: 9001, hostPort: 9001, protocol: 'tcp' }
      ],
      cpuCores: 2,
      ramLimit: 4,
      volumes: [
        { hostPath: '/data/minio', containerPath: '/data', readOnly: false }
      ],
      environment: {
        MINIO_ROOT_USER: 'admin',
        MINIO_ROOT_PASSWORD: '********'
      },
      networkMode: 'bridge'
    },
    runtime: {
      id: '8480b668bb9e',
      endpoint: '127.0.0.1:9000',
      allocatedCPU: 2,
      allocatedRAM: 4,
      startedAt: new Date(Date.now() - 7 * 7 * 24 * 60 * 60 * 1000) // 7 weeks ago
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-system': 'true' })
  },

  // AI Inference Containers (label: aio-inference)
  {
    name: 'Qwen2.5-7B Inference',
    description: 'Qwen2.5-7B LLM inference server with vLLM',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'inference-container',
      modelId: modelQwen25 ? modelQwen25._id.toString() : '',
      modelPath: 's3://models/qwen2.5-7b',
      dockerImage: 'qwen25-7b:latest',
      containerPort: 3901,
      gpuDeviceIds: ['GPU-0'],
      gpuMemoryLimit: 16384,
      cpuCores: 4,
      ramLimit: 16,
      environment: {
        MODEL_NAME: 'Qwen2.5-7B',
        TENSOR_PARALLEL_SIZE: '1',
        MAX_MODEL_LEN: '32768'
      },
      healthCheckPath: '/health'
    },
    runtime: {
      id: '999e628dab46',
      endpoint: '127.0.0.1:3901',
      allocatedGPU: ['GPU-0'],
      allocatedCPU: 4,
      allocatedRAM: 16,
      startedAt: new Date(Date.now() - 5 * 7 * 24 * 60 * 60 * 1000) // 5 weeks ago
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-inference': 'true' })
  },

  {
    name: 'VBD-LLaMA2 Inference',
    description: 'Vietnamese-optimized LLaMA2 7B inference server',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'inference-container',
      modelId: modelVBD ? modelVBD._id.toString() : '',
      modelPath: 's3://models/vbd-llama2-7b',
      dockerImage: 'vbd-llama2:latest',
      containerPort: 3904,
      gpuDeviceIds: ['GPU-0'],
      gpuMemoryLimit: 16384,
      cpuCores: 4,
      ramLimit: 16,
      environment: {
        MODEL_NAME: 'VBD-LLaMA2-7B',
        TENSOR_PARALLEL_SIZE: '1',
        MAX_MODEL_LEN: '4096'
      },
      healthCheckPath: '/health'
    },
    runtime: {
      id: 'c98f12e9fca2',
      endpoint: '127.0.0.1:3904',
      allocatedGPU: ['GPU-0'],
      allocatedCPU: 4,
      allocatedRAM: 16,
      startedAt: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-inference': 'true' })
  },

  {
    name: 'YOLOv8 Detection',
    description: 'YOLOv8 object detection inference server',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'inference-container',
      modelId: modelYOLO ? modelYOLO._id.toString() : '',
      modelPath: 's3://models/yolov8m',
      dockerImage: 'yolov8m:latest',
      containerPort: 3903,
      gpuDeviceIds: ['GPU-0'],
      gpuMemoryLimit: 8192,
      cpuCores: 2,
      ramLimit: 8,
      environment: {
        MODEL_NAME: 'YOLOv8m',
        CONFIDENCE_THRESHOLD: '0.5'
      },
      healthCheckPath: '/health'
    },
    runtime: {
      id: 'f65497fa3d8d',
      endpoint: '127.0.0.1:3903',
      allocatedGPU: ['GPU-0'],
      allocatedCPU: 2,
      allocatedRAM: 8,
      startedAt: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-inference': 'true' })
  },

  {
    name: 'Whisper Large V3 ASR',
    description: 'Whisper Large V3 speech recognition inference server',
    resourceType: 'inference-container',
    nodeId: NODE_ID,
    status: 'running',
    config: {
      type: 'inference-container',
      modelId: modelWhisper ? modelWhisper._id.toString() : '',
      modelPath: 's3://models/whisper-large-v3',
      dockerImage: 'whisper-large-v3:latest',
      containerPort: 3902,
      gpuDeviceIds: ['GPU-0'],
      gpuMemoryLimit: 8192,
      cpuCores: 4,
      ramLimit: 8,
      environment: {
        MODEL_NAME: 'Whisper-Large-v3',
        LANGUAGE: 'auto'
      },
      healthCheckPath: '/health'
    },
    runtime: {
      id: 'da554f7e050d',
      endpoint: '127.0.0.1:3902',
      allocatedGPU: ['GPU-0'],
      allocatedCPU: 4,
      allocatedRAM: 8,
      startedAt: new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000)
    },
    lastHealthCheck: new Date(),
    ...createBaseFields(USER_ID, ORG_ID, { 'aio-inference': 'true' })
  }
];

// Insert resources
let successCount = 0;
let errorCount = 0;
const insertedIds = [];

resources.forEach((resource, index) => {
  try {
    const result = db.resources.insertOne(resource);

    if (result.acknowledged) {
      successCount++;
      insertedIds.push(result.insertedId);
      const labels = Object.keys(resource.metadata.labels).join(', ');
      print(`✅ [${index + 1}/${resources.length}] Inserted: ${resource.name}`);
      print(`   Type: ${resource.resourceType} | Status: ${resource.status}`);
      print(`   Container ID: ${resource.runtime.id} | Endpoint: ${resource.runtime.endpoint}`);
      print(`   Labels: ${labels}`);
      print(`   ID: ${result.insertedId}`);
    } else {
      errorCount++;
      print(`❌ [${index + 1}/${resources.length}] Failed to insert: ${resource.name}`);
    }
  } catch (error) {
    errorCount++;
    print(`❌ [${index + 1}/${resources.length}] Error inserting ${resource.name}: ${error.message}`);
  }
  print('');
});

print('========================================');
print('Seeding Summary');
print('========================================');
print(`✅ Success: ${successCount}`);
print(`❌ Errors: ${errorCount}`);
print(`📊 Total: ${resources.length}`);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');
const count = db.resources.countDocuments({ 'owner.orgId': ORG_ID });
print(`Total resources for organization: ${count}`);
print('');

print('Resources by Type:');
const byType = db.resources.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  { $group: { _id: '$resourceType', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

byType.forEach(item => {
  print(`  - ${item._id}: ${item.count}`);
});
print('');

print('Resources by Status:');
const byStatus = db.resources.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  { $group: { _id: '$status', count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

byStatus.forEach(item => {
  print(`  - ${item._id}: ${item.count}`);
});
print('');

print('Resources by Labels:');
const systemResources = db.resources.countDocuments({
  'owner.orgId': ORG_ID,
  'metadata.labels.aio-system': 'true'
});
const inferenceResources = db.resources.countDocuments({
  'owner.orgId': ORG_ID,
  'metadata.labels.aio-inference': 'true'
});

print(`  - aio-system: ${systemResources}`);
print(`  - aio-inference: ${inferenceResources}`);
print('');

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Inserted Resource IDs:');
insertedIds.forEach((id, index) => {
  print(`  ${index + 1}. ${id}`);
});
print('');
print('Quick Query Examples:');
print('');
print('// List all resources');
print(`db.resources.find({ 'owner.orgId': ObjectId('${ORG_ID}') }).pretty();`);
print('');
print('// List system containers');
print(`db.resources.find({ 'metadata.labels.aio-system': 'true' }).pretty();`);
print('');
print('// List inference containers');
print(`db.resources.find({ 'metadata.labels.aio-inference': 'true' }).pretty();`);
print('');
print('// List running resources');
print(`db.resources.find({ 'owner.orgId': ObjectId('${ORG_ID}'), status: 'running' }).pretty();`);
