/**
 * Add mcp/fetch tool to existing tools
 * Fetch tool for making HTTP requests and fetching web content
 */

const ORG_ID = '692ff5fa3371dad36b287ec5';
const USER_ID = '692ff5fa3371dad36b287ec4';

print('========================================');
print('Adding mcp/fetch Tool');
print('========================================');
print('');

// Check if fetch tool already exists
const existing = db.tools.findOne({
  'owner.orgId': ORG_ID,
  name: 'fetch',
  isDeleted: false
});

if (existing) {
  print('ℹ️  Tool "fetch" already exists with ID: ' + existing._id);
  print('');
} else {
  // Create fetch tool
  const fetchTool = {
    name: 'fetch',
    type: 'mcp',
    description: 'MCP Fetch - Make HTTP requests, fetch web content, download files, and interact with web APIs. Supports GET, POST, and other HTTP methods with custom headers.',
    category: 'communication',

    // MCP configuration
    // Note: SSE is deprecated, but still supported. HTTP transport is recommended.
    // Agent will connect to this pre-started container
    transport: 'sse',  // Can also use 'http' for newer protocol
    endpoint: 'http://172.16.3.20:3210',
    dockerImage: 'mcp/fetch:latest',
    port: 3210,

    environment: {
      // Configuration for mcp/fetch container
      MCP_TRANSPORT: 'sse',  // or 'http'
      PORT: '3210',
      TIMEOUT: '30000',  // Request timeout in ms
      MAX_REDIRECTS: '5',
      USER_AGENT: 'MCP-Fetch/1.0',
      // Optional: ALLOWED_DOMAINS for security (comma-separated)
      // ALLOWED_DOMAINS: 'example.com,api.example.com'
    },

    healthEndpoint: '/health',

    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL to fetch',
            format: 'uri'
          },
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
            description: 'HTTP method',
            default: 'GET'
          },
          headers: {
            type: 'object',
            description: 'HTTP headers to send',
            additionalProperties: { type: 'string' }
          },
          body: {
            type: 'string',
            description: 'Request body (for POST, PUT, PATCH)'
          },
          params: {
            type: 'object',
            description: 'URL query parameters',
            additionalProperties: { type: 'string' }
          },
          timeout: {
            type: 'number',
            description: 'Request timeout in milliseconds',
            default: 30000
          },
          followRedirects: {
            type: 'boolean',
            description: 'Follow HTTP redirects',
            default: true
          },
          maxRedirects: {
            type: 'number',
            description: 'Maximum number of redirects to follow',
            default: 5
          }
        },
        required: ['url']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Whether the request was successful'
          },
          status: {
            type: 'number',
            description: 'HTTP status code'
          },
          statusText: {
            type: 'string',
            description: 'HTTP status message'
          },
          headers: {
            type: 'object',
            description: 'Response headers',
            additionalProperties: { type: 'string' }
          },
          data: {
            type: 'string',
            description: 'Response body as string'
          },
          contentType: {
            type: 'string',
            description: 'Content-Type header value'
          },
          contentLength: {
            type: 'number',
            description: 'Content-Length in bytes'
          },
          redirected: {
            type: 'boolean',
            description: 'Whether the request was redirected'
          },
          finalUrl: {
            type: 'string',
            description: 'Final URL after redirects'
          },
          error: {
            type: 'string',
            description: 'Error message if request failed'
          }
        }
      }
    },

    status: 'active',
    scope: 'public',

    // BaseSchema fields
    owner: {
      userId: USER_ID,
      orgId: ORG_ID
    },
    createdBy: USER_ID,
    updatedBy: USER_ID,
    isDeleted: false,
    metadata: {
      notes: 'Pre-start container with: docker run -d -p 3210:3210 --name mcp-fetch -e MCP_TRANSPORT=sse -e PORT=3210 mcp/fetch:latest',
      transportDeprecationNote: 'SSE transport is deprecated as of MCP protocol 2024-11-05. Consider using HTTP transport for future compatibility.',
      dockerCommand: 'docker run -d -p 3210:3210 --name mcp-fetch -e MCP_TRANSPORT=sse -e PORT=3210 mcp/fetch:latest'
    },
    isDeleted: false,
    containerId: null,  // Will be set when container is started
    lastHealthCheck: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Insert tool
  const result = db.tools.insertOne(fetchTool);

  if (result.acknowledged) {
    print('✅ Created: "fetch"');
    print('   ID: ' + result.insertedId);
    print('   Type: mcp');
    print('   Category: communication');
    print('   Endpoint: ' + fetchTool.endpoint);
    print('   Port: ' + fetchTool.port);
    print('   Transport: ' + fetchTool.transport);
    print('');
    print('📝 Docker Command to Start Container:');
    print('   docker run -d \\');
    print('     -p 3210:3210 \\');
    print('     --name mcp-fetch \\');
    print('     -e MCP_TRANSPORT=sse \\');
    print('     -e PORT=3210 \\');
    print('     -e TIMEOUT=30000 \\');
    print('     -e MAX_REDIRECTS=5 \\');
    print('     mcp/fetch:latest');
    print('');
    print('⚠️  Note: SSE transport is deprecated. Consider using HTTP transport:');
    print('   docker run -d \\');
    print('     -p 3210:3210 \\');
    print('     --name mcp-fetch \\');
    print('     -e MCP_TRANSPORT=http \\');
    print('     -e PORT=3210 \\');
    print('     mcp/fetch:latest');
    print('');
  } else {
    print('❌ Failed to insert fetch tool');
  }
}

// Verification
print('========================================');
print('Verification');
print('========================================');

const totalTools = db.tools.countDocuments({
  'owner.orgId': ORG_ID,
  isDeleted: false
});
print('Total tools in database: ' + totalTools);
print('');

// List communication category tools
const commTools = db.tools.find({
  'owner.orgId': ORG_ID,
  category: 'communication',
  isDeleted: false
}).toArray();

print('Communication Tools:');
commTools.forEach((t, i) => {
  print((i + 1) + '. ' + t.name);
  print('   ID: ' + t._id);
  print('   Type: ' + t.type);
  print('   Endpoint: ' + t.endpoint);
  print('   Transport: ' + t.transport);
  print('');
});

// Statistics by type
print('========================================');
print('Statistics by Type');
print('========================================');

const typeStats = db.tools.aggregate([
  {
    $match: {
      'owner.orgId': ORG_ID,
      isDeleted: false
    }
  },
  {
    $group: {
      _id: '$type',
      count: { $sum: 1 }
    }
  }
]).toArray();

typeStats.forEach((stat) => {
  print('  ' + stat._id + ': ' + stat.count + ' tools');
});
print('');

print('========================================');
print('✅ Complete!');
print('========================================');
print('');
print('Quick Query:');
print("db.tools.findOne({ 'owner.orgId': '" + ORG_ID + "', name: 'fetch' });");
