/**
 * Seed Controller Node to MongoDB
 * Data based on Intel Xeon E7-8880 v4 with 4x Tesla P40 GPUs
 *
 * Usage:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-node-controller.js
 *
 * Or:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm
 *   > load('scripts/seed-node-controller.js')
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
    isDeleted: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

// Controller Node Data (Intel Xeon with 4x Tesla P40)
const node = {
  name: 'Multi-GPU-Controller-001',
  role: ['controller', 'storage', 'worker', 'proxy'], // Multi-role node
  status: 'online',
  isLocal: false, // Remote node
  vpnIp: null, // Not using VPN, direct LAN access
  websocketConnected: true,
  lastHeartbeat: new Date(),

  // GPU Information - 4x Tesla P40
  gpuDevices: [
    {
      deviceId: '0',
      model: 'Tesla P40',
      memoryTotal: 25165, // 24,576 MiB = ~25,165 MB
      memoryFree: 17616, // ~7.5GB used per GPU, so ~17,616 MB free
      utilization: 0, // GPU Usage: 0% (idle)
      temperature: 51 // 51-56°C range, using 51°C
    },
    {
      deviceId: '1',
      model: 'Tesla P40',
      memoryTotal: 25165,
      memoryFree: 17616,
      utilization: 0,
      temperature: 53
    },
    {
      deviceId: '2',
      model: 'Tesla P40',
      memoryTotal: 25165,
      memoryFree: 17616,
      utilization: 0,
      temperature: 54
    },
    {
      deviceId: '3',
      model: 'Tesla P40',
      memoryTotal: 25165,
      memoryFree: 17616,
      utilization: 0,
      temperature: 56
    }
  ],

  // CPU Information
  cpuCores: 44, // 22 physical cores / 44 threads
  cpuModel: 'Intel Xeon CPU E7-8880 v4 @ 2.20GHz',
  cpuUsage: 0.4, // Usage: 0.4%

  // RAM Information (in MB)
  ramTotal: 128000, // 125 GiB = ~128,000 MB
  ramFree: 113664, // 111 GiB free = ~113,664 MB
  ramUsage: 11, // 11% used

  // Disk Information (in GB)
  diskTotal: 730, // 730 GB total

  // Network Information
  hostname: 'multi-gpu-controller-001',
  ipAddress: '10.37.48.14', // LAN IP
  publicIpAddress: null, // No public IP

  // System Information
  os: 'Ubuntu 24.04.3 LTS (Noble Numbat) x86_64',
  containerRuntime: 'Docker 28.5.1',
  daemonVersion: '1.0.0', // Daemon version (placeholder)

  // Status tracking
  lastSeenAt: new Date(),
  lastMetricsAt: new Date(),
  uptimeSeconds: 86400 * 14, // Assume 14 days uptime

  ...createBaseFields(USER_ID, ORG_ID)
};

// Insert node into MongoDB
print('========================================');
print('Seeding Controller Node to MongoDB');
print('========================================');
print(`Database: ${db.getName()}`);
print(`Target Organization: ${ORG_ID}`);
print('');

// Insert node
try {
  const result = db.nodes.insertOne(node);

  if (result.acknowledged) {
    print('✅ Controller Node inserted successfully!');
    print('');
    print('Node Details:');
    print(`  ID: ${result.insertedId}`);
    print(`  Name: ${node.name}`);
    print(`  Status: ${node.status}`);
    print(`  Roles: ${node.role.join(', ')}`);
    print('');
    print('Hardware Specifications:');
    print(`  CPU: ${node.cpuModel}`);
    print(`  CPU Cores: ${node.cpuCores} threads`);
    print(`  CPU Usage: ${node.cpuUsage}%`);
    print(`  RAM Total: ${(node.ramTotal / 1024).toFixed(2)} GB`);
    print(`  RAM Free: ${(node.ramFree / 1024).toFixed(2)} GB`);
    print(`  RAM Usage: ${node.ramUsage}%`);
    print(`  Disk Total: ${node.diskTotal} GB`);
    print(`  OS: ${node.os}`);
    print(`  Container Runtime: ${node.containerRuntime}`);
    print('');
    print('GPU Information:');
    node.gpuDevices.forEach((gpu, index) => {
      print(`  GPU ${index}:`);
      print(`    Device ID: ${gpu.deviceId}`);
      print(`    Model: ${gpu.model}`);
      print(`    VRAM Total: ${(gpu.memoryTotal / 1024).toFixed(2)} GB`);
      print(`    VRAM Free: ${(gpu.memoryFree / 1024).toFixed(2)} GB`);
      print(`    Utilization: ${gpu.utilization}%`);
      print(`    Temperature: ${gpu.temperature}°C`);
    });
    print('');
    print('Network Information:');
    print(`  Hostname: ${node.hostname}`);
    print(`  LAN IP: ${node.ipAddress}`);
    print(`  Public IP: ${node.publicIpAddress || 'None'}`);
  } else {
    print('❌ Failed to insert node');
  }
} catch (error) {
  print(`❌ Error inserting node: ${error.message}`);
}

print('');
print('========================================');
print('Verification');
print('========================================');

// Verify all nodes
const count = db.nodes.countDocuments({ 'owner.orgId': ORG_ID });
print(`Total nodes for organization ${ORG_ID}: ${count}`);
print('');

// Display comprehensive node summary
print('Cluster Summary:');
const clusterSummary = db.nodes.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  {
    $group: {
      _id: null,
      totalNodes: { $sum: 1 },
      onlineNodes: {
        $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
      },
      offlineNodes: {
        $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
      },
      totalCPUCores: { $sum: '$cpuCores' },
      totalRAM: { $sum: '$ramTotal' },
      totalDisk: { $sum: '$diskTotal' },
      totalGPUs: { $sum: { $size: { $ifNull: ['$gpuDevices', []] } } }
    }
  }
]).toArray();

if (clusterSummary.length > 0) {
  const summary = clusterSummary[0];
  print(`  Total Nodes: ${summary.totalNodes}`);
  print(`  Online: ${summary.onlineNodes}`);
  print(`  Offline: ${summary.offlineNodes}`);
  print(`  Total CPU Cores: ${summary.totalCPUCores}`);
  print(`  Total RAM: ${(summary.totalRAM / 1024).toFixed(2)} GB`);
  print(`  Total Disk: ${summary.totalDisk} GB`);
  print(`  Total GPUs: ${summary.totalGPUs}`);
}
print('');

// Show nodes by role
print('Nodes by Role:');
const nodesByRole = db.nodes.find(
  { 'owner.orgId': ORG_ID },
  { name: 1, role: 1, status: 1, _id: 0 }
).toArray();

nodesByRole.forEach(node => {
  print(`  - ${node.name}: [${node.role.join(', ')}] (${node.status})`);
});
print('');

// Calculate total GPU VRAM
print('GPU VRAM Summary:');
const vramSummary = db.nodes.aggregate([
  { $match: { 'owner.orgId': ORG_ID } },
  { $unwind: '$gpuDevices' },
  {
    $group: {
      _id: '$gpuDevices.model',
      count: { $sum: 1 },
      totalVRAM: { $sum: '$gpuDevices.memoryTotal' },
      totalFreeVRAM: { $sum: '$gpuDevices.memoryFree' }
    }
  }
]).toArray();

vramSummary.forEach(gpu => {
  print(`  ${gpu._id}:`);
  print(`    Count: ${gpu.count}x`);
  print(`    Total VRAM: ${(gpu.totalVRAM / 1024).toFixed(2)} GB`);
  print(`    Free VRAM: ${(gpu.totalFreeVRAM / 1024).toFixed(2)} GB`);
  print(`    Used VRAM: ${((gpu.totalVRAM - gpu.totalFreeVRAM) / 1024).toFixed(2)} GB`);
});
print('');

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Quick Query Examples:');
print('');
print('// List all nodes');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}') }).pretty();`);
print('');
print('// Find nodes with specific role');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}'), role: 'controller' }).pretty();`);
print('');
print('// Find nodes with Tesla P40 GPUs');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}'), 'gpuDevices.model': 'Tesla P40' }).pretty();`);
print('');
print('// Get GPU count by model');
print(`db.nodes.aggregate([
  { $match: { 'owner.orgId': ObjectId('${ORG_ID}') } },
  { $unwind: '$gpuDevices' },
  { $group: { _id: '$gpuDevices.model', count: { $sum: 1 } } }
]);`);
