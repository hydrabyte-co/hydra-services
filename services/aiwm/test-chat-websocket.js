#!/usr/bin/env node

/**
 * WebSocket Chat Test Client
 *
 * Prerequisites:
 * npm install socket.io-client axios
 *
 * Usage:
 * node test-chat-websocket.js
 */

const io = require('socket.io-client');
const axios = require('axios');

// Configuration
const IAM_URL = 'https://api.x-or.cloud/dev/iam-v2';
const AIWM_URL = 'http://localhost:3003';
const CHAT_WS_URL = 'http://localhost:3003/chat';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function main() {
  try {
    // Step 1: Login and get token
    log('\n=== Step 1: Login and Get Token ===', colors.blue);
    const loginResponse = await axios.post(`${IAM_URL}/auth/login`, {
      username: 'admin@x-or.cloud',
      password: 'NewPass123!',
    });
    const token = loginResponse.data.accessToken;
    log('✓ Token obtained', colors.green);
    log(`Token: ${token.substring(0, 50)}...`);

    // Step 2: Create conversation via REST
    log('\n=== Step 2: Create Conversation ===', colors.blue);
    const convResponse = await axios.post(
      `${AIWM_URL}/conversations`,
      {
        title: 'WebSocket Test Chat',
        description: 'Testing real-time WebSocket functionality',
        agentId: 'test-agent-ws',
        tags: ['websocket', 'real-time'],
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const conversationId = convResponse.data._id;
    log('✓ Conversation created', colors.green);
    log(`Conversation ID: ${conversationId}`);

    // Step 3: Connect to WebSocket
    log('\n=== Step 3: Connect to WebSocket ===', colors.blue);
    const socket = io(CHAT_WS_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
    });

    // Setup event listeners
    socket.on('connect', () => {
      log('✓ Connected to WebSocket server', colors.green);
      log(`Socket ID: ${socket.id}`);

      // Step 4: Join conversation
      log('\n=== Step 4: Join Conversation ===', colors.blue);
      socket.emit('conversation:join', { conversationId }, (response) => {
        log('✓ Joined conversation', colors.green);
        log(`Response: ${JSON.stringify(response)}`);

        // Step 5: Send a message via WebSocket
        log('\n=== Step 5: Send Message via WebSocket ===', colors.blue);
        socket.emit(
          'message:send',
          {
            conversationId,
            role: 'user',
            content: 'Hello from WebSocket client!',
          },
          (response) => {
            log('✓ Message sent callback received', colors.green);
            log(`Response: ${JSON.stringify(response)}`);
          }
        );

        // Step 6: Send typing indicator
        setTimeout(() => {
          log('\n=== Step 6: Send Typing Indicator ===', colors.blue);
          socket.emit('message:typing', {
            conversationId,
            isTyping: true,
          });
          log('✓ Typing indicator sent', colors.green);

          setTimeout(() => {
            socket.emit('message:typing', {
              conversationId,
              isTyping: false,
            });
            log('✓ Typing indicator stopped', colors.green);
          }, 2000);
        }, 1000);

        // Step 7: Get online users
        setTimeout(() => {
          log('\n=== Step 7: Get Online Users ===', colors.blue);
          socket.emit(
            'conversation:online',
            { conversationId },
            (response) => {
              log('✓ Online users retrieved', colors.green);
              log(`Online users: ${JSON.stringify(response)}`);
            }
          );
        }, 3000);

        // Step 8: Mark message as read
        setTimeout(() => {
          log('\n=== Step 8: Mark Message as Read ===', colors.blue);
          socket.emit('message:read', {
            conversationId,
            messageId: 'msg-123', // Placeholder
          });
          log('✓ Read receipt sent', colors.green);
        }, 4000);

        // Step 9: Leave conversation
        setTimeout(() => {
          log('\n=== Step 9: Leave Conversation ===', colors.blue);
          socket.emit(
            'conversation:leave',
            { conversationId },
            (response) => {
              log('✓ Left conversation', colors.green);
              log(`Response: ${JSON.stringify(response)}`);

              // Disconnect
              setTimeout(() => {
                log('\n=== Step 10: Disconnect ===', colors.blue);
                socket.disconnect();
                log('✓ Disconnected', colors.green);

                log('\n=== ✓ All WebSocket Tests Completed ===', colors.green);
                process.exit(0);
              }, 1000);
            }
          );
        }, 5000);
      });
    });

    // Listen for server events
    socket.on('message:new', (message) => {
      log('\n📨 Received new message:', colors.cyan);
      log(JSON.stringify(message, null, 2));
    });

    socket.on('message:sent', (data) => {
      log('\n✅ Message sent confirmation:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('message:error', (error) => {
      log('\n❌ Message error:', colors.red);
      log(JSON.stringify(error, null, 2));
    });

    socket.on('user:typing', (data) => {
      log('\n⌨️  User typing:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('user:joined', (data) => {
      log('\n👋 User joined:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('user:left', (data) => {
      log('\n👋 User left:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('presence:update', (data) => {
      log('\n👤 Presence update:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('message:read', (data) => {
      log('\n✓ Message read:', colors.cyan);
      log(JSON.stringify(data, null, 2));
    });

    socket.on('connect_error', (error) => {
      log('\n❌ Connection error:', colors.red);
      log(error.message);
      process.exit(1);
    });

    socket.on('disconnect', (reason) => {
      log(`\nDisconnected: ${reason}`, colors.yellow);
    });
  } catch (error) {
    log('\n❌ Error:', colors.red);
    log(error.message);
    if (error.response) {
      log('Response data:', colors.red);
      log(JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
