/**
 * Seed Resources Script
 *
 * Purpose: Insert demo resources (VMs and Containers) for Portal UI demonstration
 * Usage: npx ts-node services/aiwm/src/scripts/seed-resources.ts
 *
 * V1: Creates sample resources with various statuses for UI testing
 */

import { MongoClient, ObjectId } from 'mongodb';
import { ResourceType, ResourceStatus, OSImage, GPUMode, IPMode } from '../modules/resource/enums';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'hydrabyte-aiwm';

// Sample Node IDs (replace with actual node IDs from your DB)
const SAMPLE_NODE_ID = new ObjectId('673e7a1f5c9d8e001234abcd');

// Sample User/Org context
const SAMPLE_OWNER = {
  orgId: new ObjectId('673e7a1f5c9d8e001234abc0'),
  userId: new ObjectId('673e7a1f5c9d8e001234abc1'),
};

async function seedResources() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    const resourcesCollection = db.collection('resources');

    // Clear existing demo resources (optional)
    const deleteResult = await resourcesCollection.deleteMany({ name: /^Demo / });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing demo resources`);

    const demoResources = [];

    // =====================================================================
    // VIRTUAL MACHINES (5 examples with different OS and configs)
    // =====================================================================

    // 1. Ubuntu VM with GPU Passthrough
    demoResources.push({
      name: 'Demo Ubuntu GPU Server',
      description: 'Ubuntu 22.04 VM with NVIDIA GPU passthrough for deep learning',
      resourceType: ResourceType.VIRTUAL_MACHINE,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.RUNNING,
      config: {
        type: 'virtual-machine',
        osImage: OSImage.UBUNTU_22_04,
        vcpus: 16,
        ramMB: 65536, // 64GB
        diskGB: 500,
        gpuConfig: {
          enabled: true,
          mode: GPUMode.PASSTHROUGH,
          deviceIds: ['GPU-0'],
        },
        networkConfig: {
          mode: 'bridge-vlan',
          ipMode: IPMode.STATIC,
          ipAddress: '192.168.100.10',
          netmask: '255.255.255.0',
          gateway: '192.168.100.1',
          vlanId: 100,
        },
        cloudInit: {
          hostname: 'gpu-server-01',
          username: 'ubuntu',
          sshPublicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...',
        },
      },
      runtime: {
        id: 'vm-mock-ubuntu-gpu',
        endpoint: '192.168.100.10:22',
        allocatedGPU: ['GPU-0'],
        allocatedCPU: 16,
        allocatedRAM: 64,
        startedAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 7),
      updatedAt: new Date(Date.now() - 3600000),
      lastHealthCheck: new Date(Date.now() - 300000), // 5 mins ago
    });

    // 2. Windows Server VM
    demoResources.push({
      name: 'Demo Windows Server 2022',
      description: 'Windows Server for .NET applications',
      resourceType: ResourceType.VIRTUAL_MACHINE,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.STOPPED,
      config: {
        type: 'virtual-machine',
        osImage: OSImage.WINDOWS_SERVER_2022,
        vcpus: 8,
        ramMB: 32768, // 32GB
        diskGB: 250,
        networkConfig: {
          mode: 'bridge-vlan',
          ipMode: IPMode.DHCP,
        },
        cloudInit: {
          hostname: 'win-server-01',
          username: 'Administrator',
          password: 'InitialPass123!',
        },
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: new Date(Date.now() - 86400000 * 2),
    });

    // 3. CentOS Development VM
    demoResources.push({
      name: 'Demo CentOS Dev Environment',
      description: 'CentOS 8 development environment',
      resourceType: ResourceType.VIRTUAL_MACHINE,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.RUNNING,
      config: {
        type: 'virtual-machine',
        osImage: OSImage.CENTOS_8,
        vcpus: 4,
        ramMB: 16384, // 16GB
        diskGB: 100,
        networkConfig: {
          mode: 'bridge-vlan',
          ipMode: IPMode.STATIC,
          ipAddress: '192.168.100.20',
          netmask: '255.255.255.0',
          gateway: '192.168.100.1',
        },
        cloudInit: {
          hostname: 'centos-dev-01',
          username: 'centos',
          sshPublicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...',
        },
      },
      runtime: {
        id: 'vm-mock-centos-dev',
        endpoint: '192.168.100.20:22',
        allocatedCPU: 4,
        allocatedRAM: 16,
        startedAt: new Date(Date.now() - 86400000 * 3),
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 10),
      updatedAt: new Date(Date.now() - 86400000),
      lastHealthCheck: new Date(Date.now() - 600000), // 10 mins ago
    });

    // 4. Debian VM with MIG GPU
    demoResources.push({
      name: 'Demo Debian ML Workstation',
      description: 'Debian 12 with MIG GPU slice for ML experiments',
      resourceType: ResourceType.VIRTUAL_MACHINE,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.DEPLOYING,
      config: {
        type: 'virtual-machine',
        osImage: OSImage.DEBIAN_12,
        vcpus: 8,
        ramMB: 32768,
        diskGB: 200,
        gpuConfig: {
          enabled: true,
          mode: GPUMode.MIG,
          migProfile: '2g.10gb',
        },
        networkConfig: {
          mode: 'bridge-vlan',
          ipMode: IPMode.STATIC,
          ipAddress: '192.168.100.30',
          netmask: '255.255.255.0',
          gateway: '192.168.100.1',
        },
        cloudInit: {
          hostname: 'debian-ml-01',
          username: 'debian',
        },
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 1800000),
    });

    // 5. Ubuntu VM - Queued
    demoResources.push({
      name: 'Demo Ubuntu Test VM',
      description: 'Ubuntu 20.04 for testing purposes',
      resourceType: ResourceType.VIRTUAL_MACHINE,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.QUEUED,
      config: {
        type: 'virtual-machine',
        osImage: OSImage.UBUNTU_20_04,
        vcpus: 2,
        ramMB: 8192,
        diskGB: 50,
        networkConfig: {
          mode: 'bridge-vlan',
          ipMode: IPMode.DHCP,
        },
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 60000),
      updatedAt: new Date(Date.now() - 60000),
    });

    // =====================================================================
    // APPLICATION CONTAINERS (5 examples)
    // =====================================================================

    // 6. PostgreSQL Database
    demoResources.push({
      name: 'Demo PostgreSQL Database',
      description: 'PostgreSQL 16 for application data',
      resourceType: ResourceType.APPLICATION_CONTAINER,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.RUNNING,
      config: {
        type: 'application-container',
        registry: 'docker-hub',
        imageName: 'postgres',
        imageTag: '16-alpine',
        containerPorts: [
          { containerPort: 5432, hostPort: 5432, protocol: 'tcp' },
        ],
        cpuCores: 4,
        ramLimit: 8,
        volumes: [
          { hostPath: '/data/postgres/demo-db', containerPath: '/var/lib/postgresql/data' },
        ],
        environment: {
          POSTGRES_USER: 'admin',
          POSTGRES_PASSWORD: 'demo_password_123',
          POSTGRES_DB: 'app_database',
        },
        networkMode: 'bridge',
      },
      runtime: {
        id: 'container-mock-postgres',
        endpoint: 'localhost:5432',
        allocatedCPU: 4,
        allocatedRAM: 8,
        startedAt: new Date(Date.now() - 86400000 * 14),
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 14),
      updatedAt: new Date(Date.now() - 86400000 * 7),
      lastHealthCheck: new Date(Date.now() - 180000), // 3 mins ago
    });

    // 7. Redis Cache
    demoResources.push({
      name: 'Demo Redis Cache',
      description: 'Redis 7 for session and cache storage',
      resourceType: ResourceType.APPLICATION_CONTAINER,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.RUNNING,
      config: {
        type: 'application-container',
        registry: 'docker-hub',
        imageName: 'redis',
        imageTag: '7-alpine',
        containerPorts: [
          { containerPort: 6379, hostPort: 6379 },
        ],
        cpuCores: 2,
        ramLimit: 4,
        volumes: [
          { hostPath: '/data/redis/demo-cache', containerPath: '/data' },
        ],
        environment: {
          REDIS_PASSWORD: 'demo_redis_pass',
        },
      },
      runtime: {
        id: 'container-mock-redis',
        endpoint: 'localhost:6379',
        allocatedCPU: 2,
        allocatedRAM: 4,
        startedAt: new Date(Date.now() - 86400000 * 10),
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 10),
      updatedAt: new Date(Date.now() - 86400000 * 5),
      lastHealthCheck: new Date(Date.now() - 120000), // 2 mins ago
    });

    // 8. Nginx Web Server
    demoResources.push({
      name: 'Demo Nginx Web Server',
      description: 'Nginx reverse proxy and web server',
      resourceType: ResourceType.APPLICATION_CONTAINER,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.RUNNING,
      config: {
        type: 'application-container',
        registry: 'docker-hub',
        imageName: 'nginx',
        imageTag: 'alpine',
        containerPorts: [
          { containerPort: 80, hostPort: 8080 },
          { containerPort: 443, hostPort: 8443 },
        ],
        cpuCores: 2,
        ramLimit: 2,
        volumes: [
          { hostPath: '/data/nginx/conf', containerPath: '/etc/nginx/conf.d', readOnly: true },
          { hostPath: '/data/nginx/html', containerPath: '/usr/share/nginx/html' },
        ],
      },
      runtime: {
        id: 'container-mock-nginx',
        endpoint: 'localhost:8080',
        allocatedCPU: 2,
        allocatedRAM: 2,
        startedAt: new Date(Date.now() - 86400000 * 20),
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 20),
      updatedAt: new Date(Date.now() - 86400000),
      lastHealthCheck: new Date(Date.now() - 90000), // 1.5 mins ago
    });

    // 9. MongoDB Container (Stopped)
    demoResources.push({
      name: 'Demo MongoDB Instance',
      description: 'MongoDB for document storage (currently stopped)',
      resourceType: ResourceType.APPLICATION_CONTAINER,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.STOPPED,
      config: {
        type: 'application-container',
        registry: 'docker-hub',
        imageName: 'mongo',
        imageTag: '7',
        containerPorts: [
          { containerPort: 27017, hostPort: 27017 },
        ],
        cpuCores: 4,
        ramLimit: 8,
        volumes: [
          { hostPath: '/data/mongodb/demo-db', containerPath: '/data/db' },
        ],
        environment: {
          MONGO_INITDB_ROOT_USERNAME: 'admin',
          MONGO_INITDB_ROOT_PASSWORD: 'demo_mongo_pass',
        },
      },
      runtime: {
        id: 'container-mock-mongodb',
        stoppedAt: new Date(Date.now() - 86400000 * 2),
      },
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 86400000 * 15),
      updatedAt: new Date(Date.now() - 86400000 * 2),
    });

    // 10. Elasticsearch Container (Failed)
    demoResources.push({
      name: 'Demo Elasticsearch Cluster',
      description: 'Elasticsearch for search and analytics',
      resourceType: ResourceType.APPLICATION_CONTAINER,
      nodeId: SAMPLE_NODE_ID,
      status: ResourceStatus.FAILED,
      config: {
        type: 'application-container',
        registry: 'docker-hub',
        imageName: 'elasticsearch',
        imageTag: '8.11.0',
        containerPorts: [
          { containerPort: 9200, hostPort: 9200 },
          { containerPort: 9300, hostPort: 9300 },
        ],
        cpuCores: 8,
        ramLimit: 16,
        environment: {
          'discovery.type': 'single-node',
          'xpack.security.enabled': 'false',
        },
      },
      errorMessage: 'Failed to allocate memory: Out of memory on node',
      owner: SAMPLE_OWNER,
      createdBy: SAMPLE_OWNER.userId,
      updatedBy: SAMPLE_OWNER.userId,
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 1800000),
    });

    // Insert all demo resources
    const insertResult = await resourcesCollection.insertMany(demoResources);
    console.log(`✅ Inserted ${insertResult.insertedCount} demo resources`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Virtual Machines: 5`);
    console.log(`   - Application Containers: 5`);
    console.log(`   - Running: ${demoResources.filter(r => r.status === ResourceStatus.RUNNING).length}`);
    console.log(`   - Stopped: ${demoResources.filter(r => r.status === ResourceStatus.STOPPED).length}`);
    console.log(`   - Deploying: ${demoResources.filter(r => r.status === ResourceStatus.DEPLOYING).length}`);
    console.log(`   - Queued: ${demoResources.filter(r => r.status === ResourceStatus.QUEUED).length}`);
    console.log(`   - Failed: ${demoResources.filter(r => r.status === ResourceStatus.FAILED).length}`);

    console.log('\n🎉 Seed complete! Resources ready for Portal UI testing.');
    console.log('   You can now test the Resource API endpoints with these demo resources.');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the seed
seedResources();
