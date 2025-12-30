import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { MessageModule } from '../message/message.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    // JWT for WebSocket authentication - MUST match IAM service secret
    JwtModule.register({
      secret: process.env.JWT_SECRET || (() => {
        throw new Error('JWT_SECRET environment variable is required for WebSocket authentication');
      })(),
      signOptions: { expiresIn: '1h' },
    }),

    // Redis for presence tracking and horizontal scaling
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      options: {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      },
    }),

    // Message module for creating messages
    MessageModule,

    // Conversation module for auto-creating conversations
    ConversationModule,
  ],
  providers: [ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
