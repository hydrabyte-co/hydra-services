import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext, Logger } from '@nestjs/common';

/**
 * RedisIoAdapter - Socket.IO adapter with Redis for horizontal scaling
 *
 * This adapter allows multiple server instances to share WebSocket connections
 * and broadcast events across all instances using Redis Pub/Sub.
 *
 * Usage:
 * In main.ts:
 * const app = await NestFactory.create(AppModule);
 * const redisIoAdapter = new RedisIoAdapter(app);
 * await redisIoAdapter.connectToRedis();
 * app.useWebSocketAdapter(redisIoAdapter);
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(RedisIoAdapter.name);

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Create Redis clients for pub/sub
      const pubClient = createClient({ url: redisUrl });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      this.adapterConstructor = createAdapter(pubClient, subClient);

      this.logger.log('Redis adapter connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect Redis adapter:', error.message);
      this.logger.warn('Falling back to in-memory adapter (single instance only)');
      // Adapter will fall back to default in-memory adapter
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);

    // Apply Redis adapter if connected
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
      this.logger.log('Socket.IO using Redis adapter for horizontal scaling');
    } else {
      this.logger.warn('Socket.IO using default in-memory adapter (single instance only)');
    }

    return server;
  }
}
