import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  BaseService,
  FindManyOptions,
  FindManyResult,
  PaginationQueryDto,
} from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Agent, AgentDocument } from './agent.schema';
import { Instruction } from '../instruction/instruction.schema';
import { Tool } from '../tool/tool.schema';
import {
  CreateAgentDto,
  UpdateAgentDto,
  AgentConnectDto,
  AgentConnectResponseDto,
  AgentHeartbeatDto,
  AgentCredentialsResponseDto,
} from './agent.dto';
import { AgentProducer } from '../../queues/producers/agent.producer';
import { ConfigurationService } from '../configuration/configuration.service';
import { ConfigKey } from '../configuration/enums/config-key.enum';
import { DeploymentService } from '../deployment/deployment.service';

@Injectable()
export class AgentService extends BaseService<Agent> {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Instruction.name) private instructionModel: Model<Instruction>,
    @InjectModel(Tool.name) private toolModel: Model<Tool>,
    private readonly jwtService: JwtService,
    private readonly agentProducer: AgentProducer,
    private readonly configurationService: ConfigurationService,
    private readonly deploymentService: DeploymentService
  ) {
    super(agentModel as any);
  }

  /**
   * Override findById to support populate
   * If query has 'populate=instruction', populate the instructionId field
   */
  async findById(
    id: any,
    context: RequestContext,
    query?: any
  ): Promise<Agent | null> {
    const shouldPopulate = query?.populate === 'instruction';

    if (shouldPopulate) {
      const agent = await this.agentModel
        .findOne({ _id: id, isDeleted: false })
        .populate('instructionId')
        .exec();
      return agent as Agent;
    }

    return super.findById(id, context);
  }

  /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Agent>> {
    if(options.filter) {
      if (options.filter['name']) {
        options.filter['name'] = { $regex: options.filter['name'], $options: 'i' };
      }
      if (options.filter['description']) {
        options.filter['description'] = { $regex: options.filter['description'], $options: 'i' };
      }
    }
    const findResult = await super.findAll(options, context);

    // Aggregate statistics by status
    const statusStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Aggregate statistics by type
    const typeStats = await super.aggregate(
      [
        { $match: { ...options.filter } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ],
      context
    );

    // Build statistics object
    const statistics: any = {
      total: findResult.pagination.total,
      byStatus: {},
      byType: {},
    };

    // Map status statistics
    statusStats.forEach((stat: any) => {
      statistics.byStatus[stat._id] = stat.count;
    });

    // Map type statistics
    typeStats.forEach((stat: any) => {
      statistics.byType[stat._id] = stat.count;
    });

    findResult.statistics = statistics;
    return findResult;
  }

  async create(
    createAgentDto: CreateAgentDto,
    context: RequestContext
  ): Promise<Agent> {
    // Only autonomous agents have secrets
    if (createAgentDto.type === 'autonomous') {
      // Hash secret if provided
      if (createAgentDto.secret) {
        const hashedSecret = await bcrypt.hash(createAgentDto.secret, 10);
        createAgentDto.secret = hashedSecret;
      } else {
        // Generate random secret if not provided
        const randomSecret = crypto.randomBytes(32).toString('hex');
        createAgentDto.secret = await bcrypt.hash(randomSecret, 10);
      }
    } else {
      // Managed agents don't need secrets
      delete createAgentDto.secret;
    }

    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createAgentDto, context);

    // Business-specific logging with details
    this.logger.info('Agent created with details', {
      id: (saved as any)._id,
      name: saved.name,
      status: saved.status,
      nodeId: saved.nodeId,
      instructionId: saved.instructionId,
      guardrailId: saved.guardrailId,
      createdBy: context.userId,
    });

    // Emit event to queue
    await this.agentProducer.emitAgentCreated(saved);

    return saved as Agent;
  }

  /**
   * Get agent configuration for managed agents
   * Requires user authentication, returns config without issuing new JWT
   */
  async getAgentConfig(
    agentId: string,
    context: RequestContext
  ): Promise<AgentConnectResponseDto> {
    // Find agent
    const agent = await this.agentModel
      .findOne({ _id: new Types.ObjectId(agentId), isDeleted: false })
      .exec();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Verify user has access to this agent (same org)
    if (agent.owner.orgId !== context.orgId) {
      throw new UnauthorizedException('Not authorized to access this agent');
    }

    // Build instruction
    const instruction = await this.buildInstructionForAgent(agent);

    // Get allowed tools
    const tools = await this.getAllowedTools(agent);

    // Get AIWM base URL from configuration
    const aiwmBaseUrlConfig = await this.configurationService.findByKey(
      ConfigKey.AIWM_BASE_MCP_URL as any,
      context
    );
    const mcpBaseUrl = aiwmBaseUrlConfig?.value || process.env.AIWM_BASE_URL || 'http://localhost:3306';

    // Build MCP server configuration (use user's token for MCP calls)
    // Note: Frontend will need to include user's JWT token when calling MCP
    const mcpServers = {
      'Builtin': {
        type: 'http',
        url: mcpBaseUrl,
        headers: {
          Authorization: `Bearer <USER_ACCESS_TOKEN>`, // Placeholder - frontend replaces with actual token
        },
      },
    };

    // Prepare response (no accessToken for managed agents - they don't get agent JWT)
    const response: AgentConnectResponseDto = {
      accessToken: '', // Empty - managed agents use user's JWT token
      expiresIn: 0,
      refreshToken: null,
      refreshExpiresIn: 0,
      tokenType: 'bearer',
      mcpServers,
      instruction,
      settings: agent.settings || {},
    };

    // For managed agents, populate deployment info
    if (agent.type === 'managed' && agent.deploymentId) {
      try {
        // Use DeploymentService to build complete endpoint info
        const endpointInfo = await this.deploymentService.buildEndpointInfo(
          agent.deploymentId,
          context
        );

        // Get deployment and model for provider info
        const deployment = await this.agentModel.db.collection('deployments').findOne({
          _id: new Types.ObjectId(agent.deploymentId)
        });

        if (deployment && deployment.modelId) {
          const model = await this.agentModel.db.collection('models').findOne({
            _id: new Types.ObjectId(deployment.modelId)
          });

          if (model && model.deploymentType === 'api-based') {
            response.deployment = {
              id: deployment._id.toString(),
              provider: model.provider,
              model: model.modelIdentifier,
              apiEndpoint: endpointInfo.url, // Full inference endpoint
            };
          }
        }
      } catch (error) {
        this.logger.warn('Failed to populate deployment info', { error: error.message });
        // Continue without deployment info - non-critical
      }
    }

    return response;
  }

  /**
   * Agent connection/authentication endpoint
   * Validates agentId + secret, returns JWT token + config
   * For autonomous agents only
   */
  async connect(
    agentId: string,
    connectDto: AgentConnectDto
  ): Promise<AgentConnectResponseDto> {
    // Find agent with secret field (normally hidden)
    const agent = await this.agentModel
      .findOne({ _id: new Types.ObjectId(agentId), isDeleted: false })
      .select('+secret')
      .exec();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Both autonomous and managed agents can connect
    // autonomous: background agents (Discord, etc.)
    // managed: user-controlled agents (chat UI)

    // Check if agent is suspended
    if (agent.status === 'suspended') {
      throw new UnauthorizedException('Agent is suspended');
    }

    // Verify secret
    if (!agent.secret) {
      throw new UnauthorizedException('Agent has no secret configured');
    }
    const isSecretValid = await bcrypt.compare(connectDto.secret, agent.secret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles from agent.role field or settings (backward compatibility)
    const agentRoles = agent.role ? [agent.role] : ((agent.settings as any).auth_roles || ['organization.viewer']);

    // Generate JWT token with IAM-compatible payload
    const payload = {
      sub: agentId,                          // Agent ID as userId
      username: `agent:${agentId}`,          // Format: agent:<agentId>
      status: agent.status,                  // Agent status
      roles: agentRoles,                     // From agent.role or settings.auth_roles
      orgId: agent.owner.orgId,              // Owner organization ID
      groupId: '',                           // Empty for agents
      agentId: agentId,                      // Same as sub
      userId: '',                            // Empty as requested
      type: 'agent',                         // Marker for agent token
    };

    this.logger.debug('Signing JWT token with payload', {
      agentId,
      username: payload.username,
      roles: payload.roles,
      orgId: payload.orgId
    });

    const token = this.jwtService.sign(payload); // expiresIn: '24h' set in JwtModule config

    // Log first/last chars of token for debugging (never log full token)
    this.logger.debug(`Token generated: ${token.substring(0, 20)}...${token.substring(token.length - 20)}`)

    // Calculate expiresIn seconds (24 hours)
    const expiresInSeconds = 24 * 60 * 60;

    // Build instruction (MVP: just return agent instruction)
    const instruction = await this.buildInstructionForAgent(agent);

    // Get allowed tools
    const tools = await this.getAllowedTools(agent);

    // Update connection tracking
    await this.agentModel.updateOne(
      { _id: agent._id },
      {
        $set: { lastConnectedAt: new Date() },
        $inc: { connectionCount: 1 },
      }
    );

    this.logger.info('Agent connected successfully', {
      agentId,
      name: agent.name,
      username: payload.username,
      roles: payload.roles,
      connectionCount: agent.connectionCount + 1,
    });

    // Get AIWM base URL from configuration
    const aiwmBaseUrlConfig = await this.configurationService.findByKey(
      ConfigKey.AIWM_BASE_MCP_URL as any,
      { orgId: agent.owner.orgId } as RequestContext
    );
    const mcpBaseUrl = aiwmBaseUrlConfig?.value || process.env.AIWM_BASE_URL || 'http://localhost:3306';

    // Build MCP server configuration (HTTP transport format)
    const mcpServers = {
      'Builtin': {
        type: 'http',
        url: mcpBaseUrl,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    };

    // Prepare response
    const response: AgentConnectResponseDto = {
      accessToken: token,
      expiresIn: expiresInSeconds,
      refreshToken: null,                    // Not implemented for agents
      refreshExpiresIn: 0,
      tokenType: 'bearer',
      mcpServers,                            // MCP server configurations
      instruction,
      settings: agent.settings || {},
    };

    // For managed agents, populate deployment info
    if (agent.type === 'managed' && agent.deploymentId) {
      try {
        // Use DeploymentService to build complete endpoint info
        const endpointInfo = await this.deploymentService.buildEndpointInfo(
          agent.deploymentId,
          { orgId: agent.owner.orgId } as RequestContext
        );

        // Get deployment and model for provider info
        const deployment = await this.agentModel.db.collection('deployments').findOne({
          _id: new Types.ObjectId(agent.deploymentId)
        });

        if (deployment && deployment.modelId) {
          const model = await this.agentModel.db.collection('models').findOne({
            _id: new Types.ObjectId(deployment.modelId)
          });

          if (model && model.deploymentType === 'api-based') {
            response.deployment = {
              id: deployment._id.toString(),
              provider: model.provider,
              model: model.modelIdentifier,
              apiEndpoint: endpointInfo.url, // Use endpoint from buildEndpointInfo
            };
          }
        }
      } catch (error) {
        this.logger.warn('Failed to populate deployment info', { error: error.message });
        // Continue without deployment info - non-critical
      }
    }

    return response;
  }

  /**
   * Build merged instruction for agent
   * MVP: Just return agent's instruction content
   * TODO: Future - merge global + agent-specific + context instructions
   */
  private async buildInstructionForAgent(agent: Agent): Promise<string> {
    if (!agent.instructionId) {
      return 'No instruction configured for this agent.';
    }

    const instruction = await this.instructionModel
      .findOne({ _id: agent.instructionId, isDeleted: false })
      .exec();

    if (!instruction) {
      this.logger.warn('Instruction not found for agent', {
        agentId: (agent as any)._id,
        instructionId: agent.instructionId,
      });
      return 'Instruction not found.';
    }

    // MVP: Return systemPrompt + guidelines
    let instructionText = instruction.systemPrompt;

    if (instruction.guidelines && instruction.guidelines.length > 0) {
      instructionText += '\n\n## Guidelines\n';
      instruction.guidelines.forEach((guideline, index) => {
        instructionText += `${index + 1}. ${guideline}\n`;
      });
    }

    // TODO: Merge with global instruction (org-level)
    // TODO: Merge with context instruction (project/feature)

    return instructionText;
  }

  /**
   * Get allowed tools for agent (whitelist)
   */
  private async getAllowedTools(agent: Agent): Promise<Tool[]> {
    if (!agent.allowedToolIds || agent.allowedToolIds.length === 0) {
      return [];
    }

    const toolIds = agent.allowedToolIds.map((id) => new Types.ObjectId(id));
    const tools = await this.toolModel
      .find({
        _id: { $in: toolIds },
        isDeleted: false,
        status: 'active',
      })
      .exec();

    return tools;
  }

  /**
   * Agent heartbeat endpoint
   * Updates lastHeartbeatAt timestamp
   */
  async heartbeat(
    agentId: string,
    heartbeatDto: AgentHeartbeatDto
  ): Promise<{ success: boolean }> {
    const agent = await this.agentModel
      .findOne({ _id: new Types.ObjectId(agentId), isDeleted: false })
      .exec();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    await this.agentModel.updateOne(
      { _id: agent._id },
      { $set: { lastHeartbeatAt: new Date() } }
    );

    this.logger.debug('Agent heartbeat received', {
      agentId,
      status: heartbeatDto.status,
      metrics: heartbeatDto.metrics,
    });

    return { success: true };
  }

  /**
   * Regenerate agent credentials (admin only)
   * Returns new secret + env config + install script
   * Only works for autonomous agents
   */
  async regenerateCredentials(
    agentId: string,
    context: RequestContext
  ): Promise<AgentCredentialsResponseDto> {
    const agent = await this.agentModel
      .findOne({ _id: new Types.ObjectId(agentId), isDeleted: false })
      .exec();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Only autonomous agents have credentials
    if (agent.type !== 'autonomous') {
      throw new BadRequestException('Only autonomous agents have credentials to regenerate');
    }

    // Generate new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = await bcrypt.hash(newSecret, 10);

    // Update agent
    await this.agentModel.updateOne(
      { _id: agent._id },
      { $set: { secret: hashedSecret } }
    );

    this.logger.info('Agent credentials regenerated', {
      agentId,
      regeneratedBy: context.userId,
    });

    // Build env config snippet
    const envConfig = this.buildEnvConfig(agentId, newSecret, agent);

    // Build install script (placeholder/sample)
    const installScript = this.buildInstallScript(agentId, newSecret, agent);

    return {
      agentId,
      secret: newSecret,
      envConfig,
      installScript,
    };
  }

  /**
   * Build .env configuration snippet
   */
  private buildEnvConfig(
    agentId: string,
    secret: string,
    agent: Agent
  ): string {
    const baseUrl = process.env.AIWM_PUBLIC_URL || 'https://api.x-or.cloud/dev/aiwm';
    const settings = agent.settings || {};

    // Extract common settings with defaults (flat fields with backward compatibility)
    const claudeModel = (settings as any).claude_model || (settings as any).claudeModel || 'claude-3-5-haiku-latest';
    const maxTurns = (settings as any).claude_maxTurns || (settings as any).maxTurns || 100;
    const permissionMode = (settings as any).claude_permissionMode || (settings as any).permissionMode || 'bypassPermissions';
    const resume = (settings as any).claude_resume !== undefined ? (settings as any).claude_resume : ((settings as any).resume !== false); // default true

    let envConfig = `# ===== AIWM Integration =====
AIWM_ENABLED=true
AIWM_BASE_URL=${baseUrl}
AIWM_AGENT_ID=${agentId}
AIWM_AGENT_SECRET=${secret}

# ===== Agent Info =====
AGENT_NAME=${agent.name}

# ===== Claude Code SDK Configuration =====
CLAUDE_MODEL=${claudeModel}
CLAUDE_MAX_TURNS=${maxTurns}
CLAUDE_PERMISSION_MODE=${permissionMode}
CLAUDE_RESUME=${resume}
`;

    // Add OAuth token if present (flat field with backward compatibility)
    const claudeOAuthToken = (settings as any).claude_oauthToken || (settings as any).claudeOAuthToken;
    if (claudeOAuthToken) {
      envConfig += `CLAUDE_CODE_OAUTH_TOKEN=${claudeOAuthToken}\n`;
    }

    // Add platform configurations
    envConfig += `
# ===== Platform Configuration (Optional) =====
# Configure your platform settings here
`;

    // Discord settings (flat fields with backward compatibility)
    const discordToken = (settings as any).discord_token || (settings as any).discord?.token;
    const discordChannelIds = (settings as any).discord_channelIds || (settings as any).discord?.channelIds;
    const discordBotId = (settings as any).discord_botId || (settings as any).discord?.botId;

    if (discordToken || discordChannelIds || discordBotId) {
      if (discordToken) envConfig += `DISCORD_TOKEN=${discordToken}\n`;
      if (discordChannelIds) envConfig += `DISCORD_CHANNEL_ID=${Array.isArray(discordChannelIds) ? discordChannelIds.join(',') : discordChannelIds}\n`;
      if (discordBotId) envConfig += `DISCORD_BOT_ID=${discordBotId}\n`;
    } else {
      envConfig += `# DISCORD_TOKEN=your_discord_token\n# DISCORD_CHANNEL_ID=your_channel_id\n`;
    }

    // Telegram settings (flat fields with backward compatibility)
    const telegramToken = (settings as any).telegram_token || (settings as any).telegram?.token;
    const telegramGroupIds = (settings as any).telegram_groupIds || (settings as any).telegram?.groupIds;
    const telegramBotUsername = (settings as any).telegram_botUsername || (settings as any).telegram?.botUsername;

    if (telegramToken || telegramGroupIds || telegramBotUsername) {
      if (telegramToken) envConfig += `TELEGRAM_BOT_TOKEN=${telegramToken}\n`;
      if (telegramGroupIds) envConfig += `TELEGRAM_GROUP_ID=${Array.isArray(telegramGroupIds) ? telegramGroupIds.join(',') : telegramGroupIds}\n`;
      if (telegramBotUsername) envConfig += `TELEGRAM_BOT_USERNAME=${telegramBotUsername}\n`;
    } else {
      envConfig += `# TELEGRAM_BOT_TOKEN=your_telegram_token\n# TELEGRAM_GROUP_ID=your_group_id\n`;
    }

    return envConfig;
  }

  /**
   * Build installation script (placeholder/sample)
   * TODO: Implement complete installation script with actual deployment logic
   */
  private buildInstallScript(
    agentId: string,
    secret: string,
    agent: Agent
  ): string {
    const baseUrl = process.env.AIWM_PUBLIC_URL || 'https://api.x-or.cloud/dev/aiwm';

    return `#!/bin/bash
# ============================================
# Agent Installation Script (PLACEHOLDER)
# ============================================
# Agent: ${agent.name}
# Agent ID: ${agentId}
# Generated: ${new Date().toISOString()}
#
# TODO: This is a placeholder/sample script
# TODO: Implement actual installation logic
# ============================================

echo "Installing agent: ${agent.name}"

# Step 1: Clone agent repository
# TODO: Replace with actual repository URL
# git clone https://github.com/your-org/agent-repo.git
# cd agent-repo

# Step 2: Install dependencies
# npm install

# Step 3: Configure environment
cat > .env << 'EOF'
AIWM_ENABLED=true
AIWM_BASE_URL=${baseUrl}
AIWM_AGENT_ID=${agentId}
AIWM_AGENT_SECRET=${secret}
AGENT_NAME=${agent.name}

# Platform configuration (customize as needed)
# DISCORD_TOKEN=your_token
# TELEGRAM_BOT_TOKEN=your_token
EOF

# Step 4: Build and start
# npm run build
# npm start

echo "Installation script placeholder - implement actual logic"
`;
  }

  async updateAgent(
    id: string,
    updateAgentDto: UpdateAgentDto,
    context: RequestContext
  ): Promise<Agent | null> {
    // Prevent type changes (managed <-> autonomous)
    if (updateAgentDto.type) {
      const existingAgent = await this.agentModel.findById(id).exec();
      if (existingAgent && existingAgent.type !== updateAgentDto.type) {
        throw new BadRequestException(
          `Cannot change agent type from '${existingAgent.type}' to '${updateAgentDto.type}'. ` +
          'Please delete and recreate the agent with the desired type.'
        );
      }
    }

    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(
      objectId as any,
      updateAgentDto as any,
      context
    );

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Agent updated with details', {
        id: (updated as any)._id,
        name: updated.name,
        status: updated.status,
        nodeId: updated.nodeId,
        instructionId: updated.instructionId,
        guardrailId: updated.guardrailId,
        updatedBy: context.userId,
      });

      // Emit event to queue
      await this.agentProducer.emitAgentUpdated(updated);
    }

    return updated as Agent;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(
      new Types.ObjectId(id) as any,
      context
    );

    if (result) {
      // Business-specific logging
      this.logger.info('Agent soft deleted with details', {
        id,
        deletedBy: context.userId,
      });

      // Emit event to queue
      await this.agentProducer.emitAgentDeleted(id);
    }
  }
}
