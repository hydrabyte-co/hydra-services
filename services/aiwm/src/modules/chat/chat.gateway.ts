import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from '../message/dto/create-message.dto';
import { ConversationService } from '../conversation/conversation.service';

/**
 * ChatGateway - WebSocket Gateway for real-time chat
 *
 * Events:
 * - conversation:join - Join a conversation room
 * - conversation:leave - Leave a conversation room
 * - message:send - Send a new message
 * - message:typing - User is typing
 * - presence:online - User/agent online status
 *
 * Emitted events:
 * - message:new - New message received
 * - message:sent - Message successfully sent
 * - message:error - Error sending message
 * - user:typing - Another user is typing
 * - presence:update - Online status update
 */
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*', // TODO: Configure CORS properly in production
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly conversationService: ConversationService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake auth, headers, or query parameters
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        client.handshake.query?.token;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);

      // Determine if this is a user or agent token
      const isAgent = payload.type === 'agent' || !!payload.agentId;

      // Store connection info in socket data
      client.data.type = isAgent ? 'agent' : 'user';
      client.data.userId = isAgent ? null : (payload.sub || payload.userId);
      client.data.agentId = isAgent ? (payload.agentId || payload.sub) : null;
      client.data.roles = payload.roles || [];
      client.data.orgId = payload.orgId;

      // Track online presence
      if (isAgent) {
        await this.chatService.setAgentOnline(client.data.agentId, client.id);
        this.logger.log(
          `Client ${client.id} connected (agent: ${client.data.agentId})`,
        );

        // Auto-create or reuse conversation for agent
        const conversation = await this.conversationService.findOrCreateForAgent(
          client.data.agentId,
          client.data.orgId,
        );

        const conversationId = (conversation as any)._id.toString();

        // Auto-join the conversation room
        await client.join(`conversation:${conversationId}`);
        client.data.conversationId = conversationId;

        // Track in Redis
        await this.chatService.joinConversation(
          conversationId,
          client.data.agentId,
        );

        this.logger.log(
          `Agent ${client.data.agentId} auto-joined conversation ${conversationId}`,
        );
      } else {
        await this.chatService.setUserOnline(client.data.userId, client.id);
        this.logger.log(
          `Client ${client.id} connected (user: ${client.data.userId})`,
        );
      }

      // Broadcast online status
      this.server.emit('presence:update', {
        type: client.data.type,
        userId: client.data.userId,
        agentId: client.data.agentId,
        conversationId: client.data.conversationId,
        status: 'online',
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}:`,
        error.message,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.type === 'agent' && client.data.agentId) {
      await this.chatService.setAgentOffline(client.data.agentId, client.id);
      this.logger.log(
        `Client ${client.id} disconnected (agent: ${client.data.agentId})`,
      );

      // Broadcast offline status
      this.server.emit('presence:update', {
        type: 'agent',
        agentId: client.data.agentId,
        status: 'offline',
        timestamp: new Date(),
      });
    } else if (client.data.type === 'user' && client.data.userId) {
      await this.chatService.setUserOffline(client.data.userId, client.id);
      this.logger.log(
        `Client ${client.id} disconnected (user: ${client.data.userId})`,
      );

      // Broadcast offline status
      this.server.emit('presence:update', {
        type: 'user',
        userId: client.data.userId,
        status: 'offline',
        timestamp: new Date(),
      });
    }
  }

  /**
   * Join a conversation room
   */
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId } = data;

      // Join the room
      await client.join(`conversation:${conversationId}`);

      // Track presence in conversation
      await this.chatService.joinConversation(
        conversationId,
        client.data.userId || client.data.agentId,
      );

      const identifier = client.data.type === 'agent'
        ? `Agent ${client.data.agentId}`
        : `User ${client.data.userId}`;

      this.logger.log(
        `${identifier} joined conversation ${conversationId}`,
      );

      // Notify others in the room
      client.to(`conversation:${conversationId}`).emit('user:joined', {
        type: client.data.type,
        userId: client.data.userId,
        agentId: client.data.agentId,
        conversationId,
        timestamp: new Date(),
      });

      return { success: true, conversationId };
    } catch (error) {
      this.logger.error('Error joining conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId } = data;

      // Leave the room
      await client.leave(`conversation:${conversationId}`);

      // Remove from conversation tracking
      await this.chatService.leaveConversation(
        conversationId,
        client.data.userId || client.data.agentId,
      );

      const identifier = client.data.type === 'agent'
        ? `Agent ${client.data.agentId}`
        : `User ${client.data.userId}`;

      this.logger.log(
        `${identifier} left conversation ${conversationId}`,
      );

      // Notify others in the room
      client.to(`conversation:${conversationId}`).emit('user:left', {
        type: client.data.type,
        userId: client.data.userId,
        agentId: client.data.agentId,
        conversationId,
        timestamp: new Date(),
      });

      return { success: true, conversationId };
    } catch (error) {
      this.logger.error('Error leaving conversation:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a new message
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Auto-fill conversationId if not provided (from socket connection)
      const conversationId = dto.conversationId || client.data.conversationId;

      if (!conversationId) {
        throw new Error('No conversation found. Please join a conversation first.');
      }

      // Create message DTO with conversationId
      const messageDto = {
        ...dto,
        conversationId,
      };

      // Create request context from socket data
      const context = {
        userId: client.data.userId || '',
        roles: client.data.roles,
        orgId: client.data.orgId,
        groupId: '',
        agentId: client.data.agentId || '',
        appId: '',
      };

      // Create message via service
      const message = await this.chatService.sendMessage(messageDto, context);

      // Emit to all clients in the conversation room
      this.server
        .to(`conversation:${conversationId}`)
        .emit('message:new', message);

      // Confirm to sender
      client.emit('message:sent', {
        success: true,
        messageId: (message as any)._id,
        timestamp: new Date(),
      });

      const identifier = client.data.type === 'agent'
        ? `agent ${client.data.agentId}`
        : `user ${client.data.userId}`;

      this.logger.log(
        `Message sent in conversation ${conversationId} by ${identifier}`,
      );

      return { success: true, message };
    } catch (error) {
      this.logger.error('Error sending message:', error.message);

      // Emit error to sender
      client.emit('message:error', {
        success: false,
        error: error.message,
        timestamp: new Date(),
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * User is typing indicator
   */
  @SubscribeMessage('message:typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const { conversationId, isTyping } = data;

    // Broadcast typing status to others in the room (exclude sender)
    client.to(`conversation:${conversationId}`).emit('user:typing', {
      type: client.data.type,
      userId: client.data.userId,
      agentId: client.data.agentId,
      conversationId,
      isTyping,
      timestamp: new Date(),
    });

    return { success: true };
  }

  /**
   * Get online users in a conversation
   */
  @SubscribeMessage('conversation:online')
  async handleGetOnlineUsers(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId } = data;

      const onlineUsers = await this.chatService.getOnlineUsersInConversation(
        conversationId,
      );

      return { success: true, onlineUsers };
    } catch (error) {
      this.logger.error('Error getting online users:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark message as read
   */
  @SubscribeMessage('message:read')
  async handleMessageRead(
    @MessageBody() data: { conversationId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { conversationId, messageId } = data;

      // Broadcast read status to others in the room
      client.to(`conversation:${conversationId}`).emit('message:read', {
        type: client.data.type,
        userId: client.data.userId,
        agentId: client.data.agentId,
        messageId,
        conversationId,
        timestamp: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error('Error marking message as read:', error.message);
      return { success: false, error: error.message };
    }
  }
}
