/**
 * Seed Agent Download Configuration
 * Creates configuration entry for agent download base URL
 *
 * This configuration is used by the installation script generation
 * to download agent binaries from CDN.
 */

const ORG_ID = '691eb9e6517f917943ae1f9d';
const USER_ID = '691eba08517f917943ae1fa1';

print('========================================');
print('Seeding Agent Download Configuration');
print('========================================');
print('');

const config = {
  key: 'agent.download.base_url',
  value: 'https://cdn.x-or.cloud/agents',
  description: 'Base URL for downloading agent binaries. Agent installation scripts will download from {baseUrl}/xora-cc-agent-latest.tar.gz',
  category: 'agent',
  type: 'string',
  isSecret: false,
  status: 'active',
  orgId: ORG_ID,
  createdBy: USER_ID,
  updatedBy: USER_ID,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  metadata: {
    usage: 'agent-deployment',
    required: true,
    example: 'https://cdn.x-or.cloud/agents',
    notes: [
      'Must be a publicly accessible CDN URL',
      'Agent binary filename format: xora-cc-agent-{version}.tar.gz',
      'Use "latest" for most recent version: xora-cc-agent-latest.tar.gz'
    ]
  }
};

// Check if config already exists
const existing = db.configurations.findOne({ key: config.key, isDeleted: false });

if (existing) {
  print(`⚠️  Configuration already exists: ${config.key}`);
  print(`   Current value: ${existing.value}`);
  print(`   Updating to: ${config.value}`);

  db.configurations.updateOne(
    { _id: existing._id },
    {
      $set: {
        value: config.value,
        description: config.description,
        updatedBy: USER_ID,
        updatedAt: new Date(),
        metadata: config.metadata
      }
    }
  );

  print(`✓ Configuration updated successfully`);
} else {
  const result = db.configurations.insertOne(config);
  print(`✓ Configuration created successfully`);
  print(`   ID: ${result.insertedId}`);
  print(`   Key: ${config.key}`);
  print(`   Value: ${config.value}`);
}

print('');
print('========================================');
print('Seed completed successfully!');
print('========================================');
print('');
print('Next steps:');
print('1. Update CDN URL if needed: db.configurations.updateOne({key: "agent.download.base_url"}, {$set: {value: "your-cdn-url"}})');
print('2. Upload agent binary to CDN: https://cdn.x-or.cloud/agents/xora-cc-agent-latest.tar.gz');
print('3. Test installation script generation');
print('');
