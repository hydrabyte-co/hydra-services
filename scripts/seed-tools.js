/**
 * Seed Tools (MCP and Built-in)
 * Creates sample tools for AI agents
 */

const ORG_ID = '692ff5fa3371dad36b287ec5';
const USER_ID = '692ff5fa3371dad36b287ec4';

print('========================================');
print('Seeding Tools (MCP and Built-in)');
print('========================================');
print('');

const tools = [
  // ===================================================================
  // Built-in Tool: CBM (Core Business Management)
  // ===================================================================
  {
    name: 'cbm',
    type: 'builtin',
    description: 'Core Business Management - CRUD operations for documents, categories, and business entities',
    category: 'system',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['findDocuments', 'getDocument', 'createDocument', 'updateDocument', 'deleteDocument'],
            description: 'Action to perform'
          },
          params: {
            type: 'object',
            description: 'Parameters for the action',
            properties: {
              id: { type: 'string', description: 'Document ID (for getDocument, updateDocument, deleteDocument)' },
              filter: { type: 'object', description: 'Filter criteria (for findDocuments)' },
              page: { type: 'number', description: 'Page number (for findDocuments)' },
              limit: { type: 'number', description: 'Items per page (for findDocuments)' },
              data: { type: 'object', description: 'Document data (for createDocument, updateDocument)' }
            }
          }
        },
        required: ['action', 'params']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'org'
  },

  // ===================================================================
  // MCP Tool: Playwright (Browser Automation)
  // ===================================================================
  {
    name: 'playwright',
    type: 'mcp',
    description: 'Browser automation tool powered by Playwright - navigate web pages, interact with elements, extract data, take screenshots',
    category: 'productivity',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3201',
    dockerImage: 'mcp/playwright:latest',
    port: 3201,
    environment: {
      BROWSER_TYPE: 'chromium',
      HEADLESS: 'true',
      TIMEOUT: '30000'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['navigate', 'click', 'type', 'screenshot', 'extract', 'waitFor'],
            description: 'Browser action to perform'
          },
          url: {
            type: 'string',
            description: 'URL to navigate to'
          },
          selector: {
            type: 'string',
            description: 'CSS selector for element interaction'
          },
          text: {
            type: 'string',
            description: 'Text to type (for type action)'
          },
          waitTime: {
            type: 'number',
            description: 'Wait time in milliseconds'
          }
        },
        required: ['action']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          screenshot: { type: 'string', description: 'Base64 encoded screenshot' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'public'
  },

  // ===================================================================
  // MCP Tool: Web Search (DuckDuckGo)
  // ===================================================================
  {
    name: 'webSearch',
    type: 'mcp',
    description: 'Search the web using DuckDuckGo search engine - get relevant search results without tracking',
    category: 'productivity',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3202',
    dockerImage: 'mcp/web-search:latest',
    port: 3202,
    environment: {
      SEARCH_ENGINE: 'duckduckgo',
      MAX_RESULTS: '10',
      SAFE_SEARCH: 'moderate'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          },
          safeSearch: {
            type: 'string',
            enum: ['off', 'moderate', 'strict'],
            description: 'Safe search level',
            default: 'moderate'
          }
        },
        required: ['query']
      },
      outputSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                url: { type: 'string' },
                snippet: { type: 'string' }
              }
            }
          },
          totalResults: { type: 'number' }
        }
      }
    },
    status: 'active',
    scope: 'public'
  },

  // ===================================================================
  // MCP Tool: Puppeteer (Headless Chrome)
  // ===================================================================
  {
    name: 'puppeteer',
    type: 'mcp',
    description: 'Headless Chrome automation with Puppeteer - web scraping, PDF generation, performance testing',
    category: 'productivity',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3203',
    dockerImage: 'mcp/puppeteer:latest',
    port: 3203,
    environment: {
      HEADLESS: 'true',
      NO_SANDBOX: 'true',
      DISABLE_DEV_SHM: 'true'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['navigate', 'screenshot', 'pdf', 'scrape', 'evaluate'],
            description: 'Puppeteer action'
          },
          url: {
            type: 'string',
            description: 'URL to navigate to'
          },
          selector: {
            type: 'string',
            description: 'CSS selector for scraping'
          },
          script: {
            type: 'string',
            description: 'JavaScript to evaluate in page context'
          },
          options: {
            type: 'object',
            description: 'Additional options for the action'
          }
        },
        required: ['action', 'url']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          screenshot: { type: 'string' },
          pdf: { type: 'string' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'public'
  },

  // ===================================================================
  // MCP Tool: File Processor
  // ===================================================================
  {
    name: 'fileProcessor',
    type: 'mcp',
    description: 'Process files - convert formats, extract text, compress, resize images, parse documents',
    category: 'data',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3204',
    dockerImage: 'mcp/file-processor:latest',
    port: 3204,
    environment: {
      MAX_FILE_SIZE: '50MB',
      SUPPORTED_FORMATS: 'pdf,docx,xlsx,txt,jpg,png,gif'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['convert', 'extract', 'compress', 'resize', 'parse'],
            description: 'File processing action'
          },
          fileUrl: {
            type: 'string',
            description: 'URL of the file to process'
          },
          fileData: {
            type: 'string',
            description: 'Base64 encoded file data'
          },
          format: {
            type: 'string',
            description: 'Target format for conversion'
          },
          options: {
            type: 'object',
            description: 'Processing options (e.g., quality, dimensions)'
          }
        },
        required: ['action']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          result: { type: 'string', description: 'Processed file URL or data' },
          metadata: { type: 'object' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'public'
  },

  // ===================================================================
  // MCP Tool: Database Query
  // ===================================================================
  {
    name: 'databaseQuery',
    type: 'mcp',
    description: 'Query external databases - MongoDB, PostgreSQL, MySQL - read-only access for data retrieval',
    category: 'data',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3205',
    dockerImage: 'mcp/db-query:latest',
    port: 3205,
    environment: {
      ALLOWED_OPERATIONS: 'SELECT,FIND',
      TIMEOUT: '10000',
      MAX_RESULTS: '1000'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          dbType: {
            type: 'string',
            enum: ['mongodb', 'postgresql', 'mysql'],
            description: 'Database type'
          },
          connectionString: {
            type: 'string',
            description: 'Database connection string'
          },
          query: {
            type: 'string',
            description: 'Query to execute (SQL or MongoDB query)'
          },
          parameters: {
            type: 'array',
            description: 'Query parameters'
          }
        },
        required: ['dbType', 'connectionString', 'query']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array' },
          rowCount: { type: 'number' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'org'
  },

  // ===================================================================
  // MCP Tool: HTTP Client
  // ===================================================================
  {
    name: 'httpClient',
    type: 'mcp',
    description: 'Make HTTP requests to external APIs - GET, POST, PUT, DELETE with custom headers and authentication',
    category: 'communication',
    transport: 'sse',
    endpoint: 'http://172.16.3.20:3206',
    dockerImage: 'mcp/http-client:latest',
    port: 3206,
    environment: {
      TIMEOUT: '30000',
      MAX_REDIRECTS: '5',
      USER_AGENT: 'MCP-HTTP-Client/1.0'
    },
    healthEndpoint: '/health',
    schema: {
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            description: 'HTTP method'
          },
          url: {
            type: 'string',
            description: 'Target URL'
          },
          headers: {
            type: 'object',
            description: 'HTTP headers'
          },
          body: {
            type: 'object',
            description: 'Request body (for POST, PUT, PATCH)'
          },
          auth: {
            type: 'object',
            description: 'Authentication credentials',
            properties: {
              type: { type: 'string', enum: ['basic', 'bearer', 'api-key'] },
              credentials: { type: 'object' }
            }
          }
        },
        required: ['method', 'url']
      },
      outputSchema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          status: { type: 'number' },
          headers: { type: 'object' },
          data: { type: 'object' },
          error: { type: 'string' }
        }
      }
    },
    status: 'active',
    scope: 'public'
  }
];

print('Creating ' + tools.length + ' tools...');
print('');

let successCount = 0;
let errorCount = 0;

tools.forEach((toolData, idx) => {
  try {
    // Check if tool with same name already exists
    const existing = db.tools.findOne({
      'owner.orgId': ORG_ID,
      name: toolData.name,
      isDeleted: false
    });

    if (existing) {
      print('ℹ️  [' + (idx + 1) + '/' + tools.length + '] Tool already exists: "' + toolData.name + '"');
      return;
    }

    // Create tool document
    const tool = {
      name: toolData.name,
      type: toolData.type,
      description: toolData.description,
      category: toolData.category,
      schema: toolData.schema,
      status: toolData.status,
      scope: toolData.scope,

      // MCP-specific fields (only if type='mcp')
      transport: toolData.transport || null,
      endpoint: toolData.endpoint || null,
      dockerImage: toolData.dockerImage || null,
      port: toolData.port || null,
      environment: toolData.environment || null,
      healthEndpoint: toolData.healthEndpoint || null,
      containerId: null,
      lastHealthCheck: null,

      // BaseSchema fields
      owner: {
        userId: USER_ID,
        orgId: ORG_ID
      },
      createdBy: USER_ID,
      updatedBy: USER_ID,
      isDeleted: false,
      metadata: {},
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert tool
    const result = db.tools.insertOne(tool);

    if (result.acknowledged) {
      print('✅ [' + (idx + 1) + '/' + tools.length + '] Created: "' + toolData.name + '"');
      print('   ID: ' + result.insertedId);
      print('   Type: ' + toolData.type);
      print('   Category: ' + toolData.category);
      if (toolData.type === 'mcp') {
        print('   Endpoint: ' + toolData.endpoint);
        print('   Port: ' + toolData.port);
      }
      print('');
      successCount++;
    } else {
      print('❌ [' + (idx + 1) + '/' + tools.length + '] Failed to insert: "' + toolData.name + '"');
      errorCount++;
    }

  } catch (error) {
    print('❌ [' + (idx + 1) + '/' + tools.length + '] Error: ' + error.message);
    errorCount++;
  }
});

print('========================================');
print('Seed Summary');
print('========================================');
print('✅ Success: ' + successCount);
print('❌ Errors: ' + errorCount);
print('📊 Total: ' + tools.length);
print('');

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

// List all tools
const allTools = db.tools.find({
  'owner.orgId': ORG_ID,
  isDeleted: false
}).toArray();

print('Tools List:');
allTools.forEach((t, i) => {
  print((i + 1) + '. ' + t.name + ' (' + t.type + ')');
  print('   ID: ' + t._id);
  print('   Category: ' + t.category);
  print('   Status: ' + t.status);
  print('   Scope: ' + t.scope);
  if (t.type === 'mcp') {
    print('   Endpoint: ' + t.endpoint);
    print('   Port: ' + t.port);
  }
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

// Statistics by category
print('========================================');
print('Statistics by Category');
print('========================================');

const categoryStats = db.tools.aggregate([
  {
    $match: {
      'owner.orgId': ORG_ID,
      isDeleted: false
    }
  },
  {
    $group: {
      _id: '$category',
      count: { $sum: 1 }
    }
  }
]).toArray();

categoryStats.forEach((stat) => {
  print('  ' + stat._id + ': ' + stat.count + ' tools');
});
print('');

print('========================================');
print('✅ Seeding Complete!');
print('========================================');
print('');
print('Quick Query Examples:');
print('');
print('// List all tools');
print("db.tools.find({ 'owner.orgId': '" + ORG_ID + "', isDeleted: false }).pretty();");
print('');
print('// Find MCP tools only');
print("db.tools.find({ 'owner.orgId': '" + ORG_ID + "', type: 'mcp' }).pretty();");
print('');
print('// Find built-in tools only');
print("db.tools.find({ 'owner.orgId': '" + ORG_ID + "', type: 'builtin' }).pretty();");
print('');
print('// Find active tools');
print("db.tools.find({ 'owner.orgId': '" + ORG_ID + "', status: 'active' }).pretty();");
print('');
print('// Find tools by category');
print("db.tools.find({ 'owner.orgId': '" + ORG_ID + "', category: 'productivity' }).pretty();");
