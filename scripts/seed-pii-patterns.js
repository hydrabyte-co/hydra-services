/**
 * Seed PII patterns to database
 * Run: mongosh mongodb://172.16.3.20:27017/core_aiwm scripts/seed-pii-patterns.js
 */

const ORG_ID = '691eba0851 7f917943ae1f9d';
const USER_ID = '691eba0851 7f917943ae1fa1';

print('========================================');
print('Seeding PII Patterns');
print('========================================');
print('');

const piiPatterns = [
  // Email patterns
  {
    name: 'Email Address (Global)',
    type: 'email',
    pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
    replacement: '[EMAIL_REDACTED]',
    description: 'Detects email addresses in standard format',
    enabled: true,
    locale: 'global',
    status: 'active',
    tags: ['common', 'gdpr', 'global'],
  },

  // Phone patterns
  {
    name: 'Phone Number (Vietnam)',
    type: 'phone',
    pattern: '(\\+84|0)[0-9]{9,10}',
    replacement: '[PHONE_REDACTED]',
    description: 'Detects Vietnamese phone numbers (+84 or 0)',
    enabled: true,
    locale: 'vn',
    status: 'active',
    tags: ['common', 'vietnam', 'contact'],
  },
  {
    name: 'Phone Number (US)',
    type: 'phone',
    pattern: '(\\+1|1)?[-.]?\\(?[0-9]{3}\\)?[-.]?[0-9]{3}[-.]?[0-9]{4}',
    replacement: '[PHONE_REDACTED]',
    description: 'Detects US phone numbers in various formats',
    enabled: true,
    locale: 'us',
    status: 'active',
    tags: ['common', 'us', 'contact'],
  },

  // Credit card patterns
  {
    name: 'Credit Card Number',
    type: 'credit_card',
    pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b',
    replacement: '[CARD_REDACTED]',
    description: 'Detects credit card numbers (16 digits with optional separators)',
    enabled: true,
    locale: 'global',
    status: 'active',
    tags: ['pci-dss', 'financial', 'sensitive'],
  },

  // SSN pattern
  {
    name: 'Social Security Number (US)',
    type: 'ssn',
    pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
    replacement: '[SSN_REDACTED]',
    description: 'Detects US Social Security Numbers (format: XXX-XX-XXXX)',
    enabled: true,
    locale: 'us',
    status: 'active',
    tags: ['hipaa', 'sensitive', 'us'],
  },

  // API Key patterns
  {
    name: 'API Key (Generic)',
    type: 'api_key',
    pattern: '(?i)(api[_-]?key|apikey|access[_-]?token)\\s*[:=]\\s*[\'"]?([a-zA-Z0-9_\\-]{20,})[\'"]?',
    replacement: '[API_KEY_REDACTED]',
    description: 'Detects generic API keys and access tokens',
    enabled: true,
    locale: 'global',
    status: 'active',
    tags: ['security', 'api', 'sensitive'],
  },
  {
    name: 'Bearer Token',
    type: 'api_key',
    pattern: 'Bearer\\s+[a-zA-Z0-9_\\-\\.]{20,}',
    replacement: '[BEARER_TOKEN_REDACTED]',
    description: 'Detects Bearer tokens in Authorization headers',
    enabled: true,
    locale: 'global',
    status: 'active',
    tags: ['security', 'auth', 'sensitive'],
  },

  // Vietnamese ID card
  {
    name: 'Vietnamese ID Card (CCCD)',
    type: 'custom',
    pattern: '\\b\\d{12}\\b',
    replacement: '[ID_REDACTED]',
    description: 'Detects Vietnamese Citizen ID (CCCD - 12 digits)',
    enabled: true,
    locale: 'vn',
    status: 'active',
    tags: ['vietnam', 'identity', 'sensitive'],
  },
];

print('Inserting PII patterns...');
print('');

let inserted = 0;
let skipped = 0;

piiPatterns.forEach((pattern, index) => {
  // Check if pattern already exists
  const existing = db.piis.findOne({
    'owner.orgId': ORG_ID,
    type: pattern.type,
    name: pattern.name,
    isDeleted: false,
  });

  if (existing) {
    print(`[${index + 1}] ⏭️  Skipped: "${pattern.name}" (already exists)`);
    skipped++;
  } else {
    const doc = {
      ...pattern,
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

    const result = db.piis.insertOne(doc);
    if (result.acknowledged) {
      print(`[${index + 1}] ✅ Created: "${pattern.name}"`);
      print(`   Type: ${pattern.type}`);
      print(`   Locale: ${pattern.locale}`);
      print(`   Pattern: ${pattern.pattern.substring(0, 50)}${pattern.pattern.length > 50 ? '...' : ''}`);
      print('');
      inserted++;
    }
  }
});

print('========================================');
print('Summary');
print('========================================');
print(`✅ Inserted: ${inserted} patterns`);
print(`⏭️  Skipped: ${skipped} patterns`);
print(`📊 Total: ${piiPatterns.length} patterns`);
print('');

// Verification
print('========================================');
print('Verification');
print('========================================');

const total = db.piis.countDocuments({
  'owner.orgId': ORG_ID,
  isDeleted: false,
});
print(`Total PII patterns in database: ${total}`);
print('');

// Statistics by type
const typeStats = db.piis
  .aggregate([
    {
      $match: {
        'owner.orgId': ORG_ID,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ])
  .toArray();

print('PII Patterns by Type:');
typeStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} pattern(s)`);
});
print('');

// Statistics by locale
const localeStats = db.piis
  .aggregate([
    {
      $match: {
        'owner.orgId': ORG_ID,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$locale',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ])
  .toArray();

print('PII Patterns by Locale:');
localeStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} pattern(s)`);
});
print('');

print('========================================');
print('✅ Complete!');
print('========================================');
print('');
print('Quick Queries:');
print('');
print('# List all active patterns:');
print("db.piis.find({ 'owner.orgId': '" + ORG_ID + "', status: 'active', isDeleted: false }).pretty();");
print('');
print('# Test PII detection API:');
print('curl -X GET http://localhost:3003/pii-patterns/active -H "Authorization: Bearer YOUR_TOKEN"');
print('');
