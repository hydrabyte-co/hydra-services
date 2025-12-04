/**
 * Seed Deployments for Inference Containers
 * Creates deployment records linking Models -> Nodes -> Containers
 */

const ORG_ID = '692ff5fa3371dad36b287ec5';
const USER_ID = ObjectId('692ff5fa3371dad36b287ec4');
const NODE_ID = ObjectId('6931711bd436a16167c4c5f1'); // Multi-GPU-Controller-001

print('========================================');
print('Seeding Deployments');
print('========================================');
print('');

// Get inference containers
const resources = db.resources.find({
  'owner.orgId': ORG_ID,
  resourceType: 'inference-container'
}).toArray();

print('Found ' + resources.length + ' inference containers');
print('');

let successCount = 0;
let errorCount = 0;

resources.forEach((resource, idx) => {
  try {
    // Find corresponding model by repository
    const modelRepo = resource.config.modelRepository;
    if (!modelRepo) {
      print('⚠️  [' + (idx+1) + '/' + resources.length + '] Skipping ' + resource.name + ' - no model repository');
      return;
    }

    const model = db.models.findOne({
      'owner.orgId': ORG_ID,
      repository: modelRepo
    });

    if (!model) {
      print('⚠️  [' + (idx+1) + '/' + resources.length + '] Skipping ' + resource.name + ' - model not found: ' + modelRepo);
      return;
    }

    // Build deployment name
    const deploymentName = model.name + ' - Production';

    // Check if deployment already exists
    const existing = db.deployments.findOne({
      'owner.orgId': ORG_ID,
      modelId: model._id,
      nodeId: NODE_ID
    });

    if (existing) {
      print('ℹ️  [' + (idx+1) + '/' + resources.length + '] Deployment already exists for ' + resource.name);
      return;
    }

    // Extract container port
    const containerPort = resource.config.containerPorts && resource.config.containerPorts[0]
      ? resource.config.containerPorts[0].hostPort
      : null;

    // Extract GPU device
    const gpuDevice = resource.runtime && resource.runtime.allocatedGPU && resource.runtime.allocatedGPU.length > 0
      ? resource.runtime.allocatedGPU.join(',')
      : null;

    // Build endpoint
    const endpoint = resource.runtime && resource.runtime.endpoint
      ? resource.runtime.endpoint
      : (containerPort ? 'http://localhost:' + containerPort : null);

    // Create deployment document
    const deployment = {
      name: deploymentName,
      description: 'Production deployment of ' + model.name + ' on ' + resource.name + ' container',
      modelId: model._id,
      nodeId: NODE_ID,
      status: 'running', // Container is already running

      // Container info
      containerId: resource.runtime.id,
      containerName: resource.name,
      dockerImage: resource.config.imageName + ':' + resource.config.imageTag,
      containerPort: containerPort,

      // GPU allocation
      gpuDevice: gpuDevice,

      // Networking
      endpoint: endpoint,

      // Health
      lastHealthCheck: new Date(),
      errorMessage: null,

      // BaseSchema fields
      owner: {
        userId: USER_ID,
        orgId: ORG_ID
      },
      createdBy: USER_ID,
      updatedBy: USER_ID,
      deletedAt: null,
      metadata: {
        resourceId: resource._id.toString() // Link back to resource
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert deployment
    const result = db.deployments.insertOne(deployment);

    if (result.acknowledged) {
      print('✅ [' + (idx+1) + '/' + resources.length + '] Created: ' + deploymentName);
      print('   Deployment ID: ' + result.insertedId);
      print('   Model: ' + model.name + ' (' + model.type + ')');
      print('   Container: ' + resource.name);
      print('   Port: ' + (containerPort || 'N/A'));
      print('   GPU: ' + (gpuDevice || 'none'));
      print('   Endpoint: ' + (endpoint || 'N/A'));
      print('');
      successCount++;
    } else {
      print('❌ [' + (idx+1) + '/' + resources.length + '] Failed to insert: ' + deploymentName);
      errorCount++;
    }

  } catch (error) {
    print('❌ [' + (idx+1) + '/' + resources.length + '] Error: ' + error.message);
    errorCount++;
  }
});

print('========================================');
print('Sync Summary');
print('========================================');
print('✅ Success: ' + successCount);
print('❌ Errors: ' + errorCount);
print('📊 Total: ' + resources.length);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');

const totalDeployments = db.deployments.countDocuments({ 'owner.orgId': ORG_ID });
print('Total deployments: ' + totalDeployments);
print('');

// List all deployments
const deployments = db.deployments.find({ 'owner.orgId': ORG_ID }).toArray();
print('Deployments List:');
deployments.forEach((d, i) => {
  print((i+1) + '. ' + d.name);
  print('   ID: ' + d._id);
  print('   Model: ' + d.modelId);
  print('   Node: ' + d.nodeId);
  print('   Status: ' + d.status);
  print('   Container: ' + d.containerName + ' [' + d.containerId.substring(0, 12) + ']');
  print('   Endpoint: ' + (d.endpoint || 'N/A'));
  print('   GPU: ' + (d.gpuDevice || 'none'));
  print('');
});

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Quick Query Examples:');
print('');
print('// List all deployments');
print("db.deployments.find({ 'owner.orgId': '" + ORG_ID + "' }).pretty();");
print('');
print('// Find deployment by model');
print("db.deployments.find({ 'owner.orgId': '" + ORG_ID + "', modelId: ObjectId('MODEL_ID') }).pretty();");
print('');
print('// Find running deployments');
print("db.deployments.find({ 'owner.orgId': '" + ORG_ID + "', status: 'running' }).pretty();");
