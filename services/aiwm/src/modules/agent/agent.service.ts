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

@Injectable()
export class AgentService extends BaseService<Agent> {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    @InjectModel(Instruction.name) private instructionModel: Model<Instruction>,
    @InjectModel(Tool.name) private toolModel: Model<Tool>,
    private readonly jwtService: JwtService,
    private readonly agentProducer: AgentProducer
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

    findResult.statistics = statistics;
    return findResult;
  }

  async create(
    createAgentDto: CreateAgentDto,
    context: RequestContext
  ): Promise<Agent> {
    // Hash secret if provided
    if (createAgentDto.secret) {
      const hashedSecret = await bcrypt.hash(createAgentDto.secret, 10);
      createAgentDto.secret = hashedSecret;
    } else {
      // Generate random secret if not provided
      const randomSecret = crypto.randomBytes(32).toString('hex');
      createAgentDto.secret = await bcrypt.hash(randomSecret, 10);
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
   * Agent connection/authentication endpoint
   * Validates agentId + secret, returns JWT token + config
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

    // Check if agent is suspended
    if (agent.status === 'suspended') {
      throw new UnauthorizedException('Agent is suspended');
    }

    // Verify secret
    const isSecretValid = await bcrypt.compare(connectDto.secret, agent.secret);
    if (!isSecretValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = {
      sub: agentId,
      type: 'agent',
      orgId: agent.owner,
    };
    const token = this.jwtService.sign(payload); // expiresIn already set in JwtModule config

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
      connectionCount: agent.connectionCount + 1,
    });

    return {
      token,
      instruction,
      tools: tools as any,
      agent: {
        id: agentId,
        name: agent.name,
        orgId: typeof agent.owner === 'string' ? agent.owner : (agent.owner as any).toString(),
      },
      settings: agent.settings || {},
    };
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

    // Extract common settings with defaults
    const claudeModel = (settings as any).claudeModel || 'claude-3-5-haiku-latest';
    const maxTurns = (settings as any).maxTurns || 100;
    const permissionMode = (settings as any).permissionMode || 'bypassPermissions';
    const resume = (settings as any).resume !== false; // default true

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

    // Add OAuth token if present
    if ((settings as any).claudeOAuthToken) {
      envConfig += `CLAUDE_CODE_OAUTH_TOKEN=${(settings as any).claudeOAuthToken}\n`;
    }

    // Add platform configurations
    envConfig += `
# ===== Platform Configuration (Optional) =====
# Configure your platform settings here
`;

    if ((settings as any).discord) {
      const discord = (settings as any).discord;
      if (discord.token) envConfig += `DISCORD_TOKEN=${discord.token}\n`;
      if (discord.channelIds) envConfig += `DISCORD_CHANNEL_ID=${Array.isArray(discord.channelIds) ? discord.channelIds.join(',') : discord.channelIds}\n`;
      if (discord.botId) envConfig += `DISCORD_BOT_ID=${discord.botId}\n`;
    } else {
      envConfig += `# DISCORD_TOKEN=your_discord_token\n# DISCORD_CHANNEL_ID=your_channel_id\n`;
    }

    if ((settings as any).telegram) {
      const telegram = (settings as any).telegram;
      if (telegram.token) envConfig += `TELEGRAM_BOT_TOKEN=${telegram.token}\n`;
      if (telegram.groupIds) envConfig += `TELEGRAM_GROUP_ID=${Array.isArray(telegram.groupIds) ? telegram.groupIds.join(',') : telegram.groupIds}\n`;
      if (telegram.botUsername) envConfig += `TELEGRAM_BOT_USERNAME=${telegram.botUsername}\n`;
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
