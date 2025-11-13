import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Node } from './node.schema';
import { CreateNodeDto, UpdateNodeDto } from './node.dto';
import { NodeProducer } from '../../queues/producers/node.producer';

@Injectable()
export class NodeService extends BaseService<Node> {

  constructor(
    @InjectModel(Node.name) nodeModel: Model<Node>,
    private readonly nodeProducer: NodeProducer,
  ) {
    super(nodeModel as any);
  }

  async create(createNodeDto: CreateNodeDto, context: RequestContext): Promise<Node> {
    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createNodeDto, context);

    // Business-specific logging with details
    this.logger.info('Node created with details', {
      id: (saved as any)._id,
      nodeId: saved.nodeId,
      name: saved.name,
      role: saved.role,
      status: saved.status,
      cpuCores: saved.cpuCores,
      ramTotal: saved.ramTotal,
      createdBy: context.userId
    });

    // Emit event to queue
    await this.nodeProducer.emitNodeCreated(saved);

    return saved as Node;
  }

  async updateNode(id: string, updateNodeDto: UpdateNodeDto, context: RequestContext): Promise<Node | null> {
    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(objectId as any, updateNodeDto as any, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Node updated with details', {
        id: (updated as any)._id,
        nodeId: updated.nodeId,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        cpuCores: updated.cpuCores,
        ramTotal: updated.ramTotal,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.nodeProducer.emitNodeUpdated(updated);
    }

    return updated as Node;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Node soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.nodeProducer.emitNodeDeleted(id);
    }
  }

  /**
   * Find node by nodeId (used by WebSocket gateway)
   */
  async findByNodeId(nodeId: string): Promise<Node | null> {
    return await this.model.findOne({ nodeId }).exec();
  }

  /**
   * Update node status (used by WebSocket gateway)
   */
  async updateStatus(nodeId: string, status: string): Promise<void> {
    await this.model.updateOne(
      { nodeId },
      {
        status,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      }
    );

    this.logger.log(`Node ${nodeId} status updated to ${status}`);
  }

  /**
   * Update node information from registration
   */
  async updateNodeInfo(nodeId: string, info: any): Promise<void> {
    await this.model.updateOne(
      { nodeId },
      {
        $set: {
          ...info,
          lastSeenAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    this.logger.log(`Node ${nodeId} information updated`);
  }

  /**
   * Update heartbeat data
   */
  async updateHeartbeat(nodeId: string, heartbeatData: any): Promise<void> {
    await this.model.updateOne(
      { nodeId },
      {
        $set: {
          status: heartbeatData.status,
          uptimeSeconds: heartbeatData.uptimeSeconds,
          cpuUsage: heartbeatData.cpuUsage,
          ramUsage: heartbeatData.ramUsage,
          lastHeartbeat: new Date(),
          lastSeenAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }

  /**
   * Store metrics data
   */
  async storeMetrics(nodeId: string, metrics: any): Promise<void> {
    // TODO: Store metrics in a time-series collection or forward to monitoring system
    // For now, just update the last metrics timestamp
    await this.model.updateOne(
      { nodeId },
      {
        $set: {
          lastMetricsAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    this.logger.debug(`Metrics stored for node ${nodeId}`);
  }
}