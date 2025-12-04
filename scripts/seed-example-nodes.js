/**
 * Seed Example Nodes to MongoDB
 * Data based on actual hardware specifications
 *
 * Usage:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-example-nodes.js
 *
 * Or:
 *   mongosh mongodb://172.16.3.20:27017/core_aiwm
 *   > load('scripts/seed-example-nodes.js')
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

// Node Data (Based on actual hardware specs)
const node = {
  name: 'GPU-Node-001',
  role: ['worker'], // Worker node with GPU
  status: 'online',
  isLocal: true, // This is the local node
  vpnIp: null, // Local node doesn't need VPN
  websocketConnected: true,
  lastHeartbeat: new Date(),

  // GPU Information
  gpuDevices: [
    {
      deviceId: '0',
      model: 'NVIDIA RTX PRO 6000 Blackwell Max-Q Workstation Edition',
      memoryTotal: 100011, // ~97,887 MiB = ~100,011 MB
      memoryFree: 90025, // ~87,901 MiB used, so ~90,025 MB free
      utilization: 0, // GPU Usage: 0% (idle)
      temperature: 35 // 35°C
    }
  ],

  // CPU Information
  cpuCores: 32, // 16 physical cores / 32 threads
  cpuModel: 'AMD Ryzen Threadripper PRO 3955WX @ 3.9GHz',
  cpuUsage: 0.3, // Usage: 0.3%

  // RAM Information (in MB)
  ramTotal: 129024, // 126 GiB = ~129,024 MB
  ramFree: 119808, // 117 GiB free = ~119,808 MB
  ramUsage: 7, // 7% used

  // Disk Information (in GB)
  diskTotal: 196, // 196 GB total

  // Network Information
  hostname: 'gpu-node-001',
  ipAddress: '192.168.1.101', // LAN IP
  publicIpAddress: '14.225.2.116', // Public IP

  // System Information
  os: 'Ubuntu 24.04.3 LTS (Noble Numbat) x86_64',
  containerRuntime: 'Docker 29.0.2',
  daemonVersion: '1.0.0', // Daemon version (placeholder)

  // Status tracking
  lastSeenAt: new Date(),
  lastMetricsAt: new Date(),
  uptimeSeconds: 86400 * 7, // Assume 7 days uptime

  ...createBaseFields(USER_ID, ORG_ID)
};

// Insert node into MongoDB
print('========================================');
print('Seeding Example Node to MongoDB');
print('========================================');
print(`Database: ${db.getName()}`);
print(`Target Organization: ${ORG_ID}`);
print('');

// Check if nodes collection exists
const collections = db.getCollectionNames();
if (!collections.includes('nodes')) {
  print('⚠️  Warning: "nodes" collection does not exist yet.');
  print('   It will be created automatically on first insert.');
  print('');
}

// Optional: Clear existing nodes for this org
// Uncomment the following lines if you want to replace existing nodes
/*
print('Clearing existing nodes for this organization...');
const deleteResult = db.nodes.deleteMany({ 'owner.orgId': ORG_ID });
print(`Cleared ${deleteResult.deletedCount} existing nodes.`);
print('');
*/

// Insert node
try {
  const result = db.nodes.insertOne(node);

  if (result.acknowledged) {
    print('✅ Node inserted successfully!');
    print('');
    print('Node Details:');
    print(`  ID: ${result.insertedId}`);
    print(`  Name: ${node.name}`);
    print(`  Status: ${node.status}`);
    print(`  Role: ${node.role.join(', ')}`);
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
    print(`  Public IP: ${node.publicIpAddress}`);
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

// Verify inserted node
const count = db.nodes.countDocuments({ 'owner.orgId': ORG_ID });
print(`Total nodes for organization ${ORG_ID}: ${count}`);
print('');

// Display node summary
print('Node Summary:');
const nodesSummary = db.nodes.aggregate([
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
      totalGPUs: { $sum: { $size: { $ifNull: ['$gpuDevices', []] } } }
    }
  }
]).toArray();

if (nodesSummary.length > 0) {
  const summary = nodesSummary[0];
  print(`  Total Nodes: ${summary.totalNodes}`);
  print(`  Online: ${summary.onlineNodes}`);
  print(`  Offline: ${summary.offlineNodes}`);
  print(`  Total CPU Cores: ${summary.totalCPUCores}`);
  print(`  Total RAM: ${(summary.totalRAM / 1024).toFixed(2)} GB`);
  print(`  Total GPUs: ${summary.totalGPUs}`);
}
print('');

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Quick Query Examples:');
print('');
print('// List all nodes for this org');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}') }).pretty();`);
print('');
print('// List online nodes');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}'), status: 'online' }).pretty();`);
print('');
print('// Find nodes with GPU');
print(`db.nodes.find({ 'owner.orgId': ObjectId('${ORG_ID}'), 'gpuDevices.0': { $exists: true } }).pretty();`);
print('');
print('// Get total GPU VRAM');
print(`db.nodes.aggregate([
  { $match: { 'owner.orgId': ObjectId('${ORG_ID}') } },
  { $unwind: '$gpuDevices' },
  { $group: { _id: null, totalVRAM: { $sum: '$gpuDevices.memoryTotal' } } }
]);`);
