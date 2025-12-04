/**
 * Sync Docker Containers to Resources Collection
 * Reads from docker_containers_details.json and creates/updates resources
 *
 * Usage:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/sync-docker-resources.js
 */

const ORG_ID = ObjectId('692ff5fa3371dad36b287ec5');
const USER_ID = ObjectId('692ff5fa3371dad36b287ec4');
const NODE_ID = ObjectId('6931711bd436a16167c4c5f1'); // Multi-GPU-Controller-001

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
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Load container details from JSON file
const fs = require('fs');
const containersJson = fs.readFileSync('/usr/workspace/repos/hydra-services/docs/aiwm/docker_containers_details.json', 'utf8');
const containers = JSON.parse(containersJson);

print('========================================');
print('Syncing Docker Containers to Resources');
print('========================================');
print(`Database: ${db.getName()}`);
print(`Target Organization: ${ORG_ID}`);
print(`Target Node: ${NODE_ID}`);
print(`Total Containers: ${containers.length}`);
print('');

// Container classification
const inferenceContainers = ['qwen25-7b', 'vbd-llama2', 'yolov8', 'whisper-v3'];
const systemContainers = ['postgresql-mlflow-backend', 'mongodb-mlflow-backend', 'minio-storage-single'];

// Helper to extract GPU info from container
function extractGPUInfo(container) {
  const hostConfig = container.HostConfig || {};
  const deviceRequests = hostConfig.DeviceRequests || [];

  const gpuDeviceIds = [];
  deviceRequests.forEach(req => {
    if (req.DeviceIDs) {
      gpuDeviceIds.push(...req.DeviceIDs);
    }
  });

  return gpuDeviceIds;
}

// Helper to extract resource limits
function extractResourceLimits(container) {
  const hostConfig = container.HostConfig || {};
  const cpuQuota = hostConfig.CpuQuota || 0;
  const cpuPeriod = hostConfig.CpuPeriod || 100000;
  const memoryLimit = hostConfig.Memory || 0;

  return {
    cpuCores: cpuQuota > 0 ? cpuQuota / cpuPeriod : null,
    ramGB: memoryLimit > 0 ? memoryLimit / (1024 * 1024 * 1024) : null
  };
}

// Process each container
let successCount = 0;
let errorCount = 0;
const processedResources = [];

containers.forEach((container, index) => {
  try {
    const containerName = container.Name.substring(1); // Remove leading '/'
    const containerConfig = container.Config || {};
    const hostConfig = container.HostConfig || {};
    const state = container.State || {};
    const networkSettings = container.NetworkSettings || {};

    // Determine resource type and labels
    const isInference = inferenceContainers.includes(containerName);
    const resourceType = isInference ? 'inference-container' : 'application-container';
    const labels = {};
    if (isInference) {
      labels['aio-inference'] = 'true';
    } else {
      labels['aio-system'] = 'true';
    }

    // Extract ports
    const ports = hostConfig.PortBindings || {};
    const containerPorts = [];
    Object.keys(ports).forEach(portSpec => {
      const [containerPort, protocol] = portSpec.split('/');
      const hostBindings = ports[portSpec] || [];
      hostBindings.forEach(binding => {
        containerPorts.push({
          containerPort: parseInt(containerPort),
          hostPort: parseInt(binding.HostPort || containerPort),
          protocol: protocol || 'tcp'
        });
      });
    });

    // Extract volumes
    const binds = hostConfig.Binds || [];
    const volumeMounts = binds.map(bind => {
      const [hostPath, containerPath, mode] = bind.split(':');
      return {
        hostPath,
        containerPath,
        mode: mode || 'rw'
      };
    });

    // Extract environment variables
    const envArray = containerConfig.Env || [];
    const envVars = {};
    envArray.forEach(envStr => {
      const [key, ...valueParts] = envStr.split('=');
      envVars[key] = valueParts.join('=');
    });

    // Extract GPU info
    const gpuDeviceIds = extractGPUInfo(container);

    // Extract resource limits
    const limits = extractResourceLimits(container);

    // Extract network endpoint
    const networks = networkSettings.Networks || {};
    const networkNames = Object.keys(networks);
    const primaryNetwork = networkNames[0] || 'bridge';
    const ipAddress = networks[primaryNetwork]?.IPAddress || '';

    // Build endpoint
    let endpoint = '';
    if (containerPorts.length > 0) {
      const primaryPort = containerPorts[0];
      endpoint = `http://localhost:${primaryPort.hostPort}`;
    }

    // Parse image name and tag
    const imageFull = containerConfig.Image || '';
    const [imageName, imageTag] = imageFull.split(':');

    // Build config based on resource type
    let config = {};

    if (resourceType === 'inference-container') {
      // Find corresponding model in models collection
      let modelId = null;
      if (containerName === 'qwen25-7b') {
        const model = db.models.findOne({ repository: 'Qwen/Qwen2.5-7B', 'owner.orgId': ORG_ID });
        modelId = model ? model._id : null;
      } else if (containerName === 'vbd-llama2') {
        const model = db.models.findOne({ repository: 'LR-AI-Labs/vbd-llama2-7B-50b-chat', 'owner.orgId': ORG_ID });
        modelId = model ? model._id : null;
      } else if (containerName === 'yolov8') {
        const model = db.models.findOne({ repository: 'Ultralytics/YOLOv8', 'owner.orgId': ORG_ID });
        modelId = model ? model._id : null;
      } else if (containerName === 'whisper-v3') {
        const model = db.models.findOne({ repository: 'openai/whisper-large-v3', 'owner.orgId': ORG_ID });
        modelId = model ? model._id : null;
      }

      config = {
        type: 'inference-container',
        modelId: modelId,
        inferenceServer: imageName.includes('vllm') ? 'vllm' : 'triton',
        registry: 'local',
        imageName: imageName,
        imageTag: imageTag || 'latest',
        containerPorts: containerPorts,
        volumeMounts: volumeMounts,
        envVars: envVars,
        gpuDeviceIds: gpuDeviceIds,
        cpuLimit: limits.cpuCores,
        ramLimit: limits.ramGB,
        networkMode: hostConfig.NetworkMode || 'bridge',
        restartPolicy: hostConfig.RestartPolicy?.Name || 'unless-stopped'
      };
    } else {
      // Application container
      config = {
        type: 'application-container',
        registry: imageName.includes('/') ? 'docker-hub' : 'docker-hub',
        imageName: imageName,
        imageTag: imageTag || 'latest',
        containerPorts: containerPorts,
        volumeMounts: volumeMounts,
        envVars: envVars,
        cpuLimit: limits.cpuCores,
        ramLimit: limits.ramGB,
        networkMode: hostConfig.NetworkMode || 'bridge',
        restartPolicy: hostConfig.RestartPolicy?.Name || 'unless-stopped'
      };
    }

    // Build runtime info
    const runtime = {
      id: container.Id,
      endpoint: endpoint,
      allocatedGPU: gpuDeviceIds,
      allocatedCPU: limits.cpuCores,
      allocatedRAM: limits.ramGB,
      startedAt: state.StartedAt ? new Date(state.StartedAt) : new Date(),
      stoppedAt: state.FinishedAt && state.Status !== 'running' ? new Date(state.FinishedAt) : null
    };

    // Build resource document
    const resource = {
      name: containerName,
      description: `Container: ${imageName}:${imageTag || 'latest'}`,
      resourceType: resourceType,
      nodeId: NODE_ID,
      status: 'running',
      config: config,
      runtime: runtime,
      lastHealthCheck: new Date(),
      errorMessage: null,
      metadata: { labels: labels },
      ...createBaseFields(USER_ID, ORG_ID)
    };

    // Check if resource already exists (by runtime.id)
    const existing = db.resources.findOne({ 'runtime.id': container.Id });

    let result;
    if (existing) {
      // Update existing resource
      result = db.resources.updateOne(
        { _id: existing._id },
        { $set: resource }
      );
      print(`✅ [${index + 1}/${containers.length}] Updated: ${containerName}`);
    } else {
      // Insert new resource
      result = db.resources.insertOne(resource);
      print(`✅ [${index + 1}/${containers.length}] Inserted: ${containerName}`);
    }

    print(`   Type: ${resourceType}`);
    print(`   Image: ${imageName}:${imageTag || 'latest'}`);
    print(`   Ports: ${containerPorts.map(p => `${p.containerPort}:${p.hostPort}`).join(', ') || 'none'}`);
    print(`   GPUs: ${gpuDeviceIds.length > 0 ? gpuDeviceIds.join(', ') : 'none'}`);
    print(`   Labels: ${Object.keys(labels).join(', ')}`);
    print('');

    successCount++;
    processedResources.push({
      name: containerName,
      type: resourceType,
      id: existing ? existing._id : result.insertedId
    });

  } catch (error) {
    errorCount++;
    print(`❌ [${index + 1}/${containers.length}] Error processing ${container.Name}: ${error.message}`);
    print('');
  }
});

print('========================================');
print('Sync Summary');
print('========================================');
print(`✅ Success: ${successCount}`);
print(`❌ Errors: ${errorCount}`);
print(`📊 Total: ${containers.length}`);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');
const totalResources = db.resources.countDocuments({ 'owner.orgId': ORG_ID });
print(`Total resources for organization: ${totalResources}`);
print('');

// Stats by type
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

// Stats by status
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

// Stats by labels
print('Resources by Labels:');
const withInference = db.resources.countDocuments({
  'owner.orgId': ORG_ID,
  'metadata.labels.aio-inference': 'true'
});
const withSystem = db.resources.countDocuments({
  'owner.orgId': ORG_ID,
  'metadata.labels.aio-system': 'true'
});
print(`  - aio-inference: ${withInference}`);
print(`  - aio-system: ${withSystem}`);
print('');

print('========================================');
print('✅ Sync Complete!');
print('========================================');
print('');
print('Quick Query Examples:');
print('');
print('// List all resources');
print(`db.resources.find({ 'owner.orgId': ObjectId('${ORG_ID}') }).pretty();`);
print('');
print('// List inference containers');
print(`db.resources.find({ 'owner.orgId': ObjectId('${ORG_ID}'), resourceType: 'inference-container' }).pretty();`);
print('');
print('// List containers with GPU');
print(`db.resources.find({ 'owner.orgId': ObjectId('${ORG_ID}'), 'runtime.allocatedGPU.0': { $exists: true } }).pretty();`);
print('');
print('// Find resource by container ID');
print(`db.resources.findOne({ 'runtime.id': '999e628dab4604e40c3954f0e247a07a9651f414a09ce4a7d90701ba5992a2c3' });`);
