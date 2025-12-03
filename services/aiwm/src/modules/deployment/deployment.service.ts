import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Deployment } from './deployment.schema';
import { Model as ModelEntity } from '../model/model.schema';
import { Node } from '../node/node.schema';

/**
 * DeploymentService
 * Manages deployment entities for deploying models on GPU nodes
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class DeploymentService extends BaseService<Deployment> {
  constructor(
    @InjectModel(Deployment.name) private deploymentModel: Model<Deployment>,
    @InjectModel(ModelEntity.name)
    private readonly modelModel: Model<ModelEntity>,
    @InjectModel(Node.name) private readonly nodeModel: Model<Node>
  ) {
    super(deploymentModel);
  }

  /**
   * Override create method to validate model and node before deployment
   * - Model must exist and status = 'active'
   * - Node must exist and status = 'online'
   */
  async create(
    createData: Partial<Deployment>,
    context: RequestContext
  ): Promise<Deployment | null> {
    const { modelId, nodeId } = createData;

    if (!modelId || !nodeId) {
      throw new BadRequestException('modelId and nodeId are required');
    }

    // Validate Model exists and is active
    const model = await this.modelModel
      .findOne({
        _id: modelId,
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!model) {
      throw new BadRequestException(`Model with ID ${modelId} not found`);
    }

    if (model.status !== 'active') {
      throw new BadRequestException(
        `Model "${model.name}" must be in 'active' status to create deployment. Current status: ${model.status}`
      );
    }

    // Validate Node exists and is online
    const node = await this.nodeModel
      .findOne({
        _id: nodeId,
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!node) {
      throw new BadRequestException(`Node with ID ${nodeId} not found`);
    }

    if (node.status !== 'online') {
      throw new BadRequestException(
        `Node "${node.name}" must be 'online' to create deployment. Current status: ${node.status}`
      );
    }

    // Set default status to 'queued' if not provided
    if (!createData.status) {
      createData.status = 'queued';
    }

    // Call parent create method
    const deployment = await super.create(createData, context);

    // TODO: Emit event to queue for deployment process
    // await this.deploymentProducer.emitDeploymentCreated(deployment);

    return deployment as Deployment;
  }

  /**
   * Override update method to validate status transitions
   * Prevents invalid status changes
   */
  async update(
    id: ObjectId,
    updateData: Partial<Deployment>,
    context: RequestContext
  ): Promise<Deployment | null> {
    // If status is being changed, validate the transition
    if (updateData.status) {
      const currentDeployment = await this.deploymentModel
        .findOne({
          _id: id,
          isDeleted: false,
        })
        .lean()
        .exec();

      if (!currentDeployment) {
        throw new BadRequestException(`Deployment with ID ${id} not found`);
      }

      // Validate status transition
      this.validateStatusTransition(
        currentDeployment.status,
        updateData.status
      );
    }

    // Call parent update method
    const updated = await super.update(id, updateData, context);

    // TODO: Emit event to queue for status change handling
    // if (updateData.status) {
    //   await this.deploymentProducer.emitDeploymentStatusChanged(updated);
    // }

    return updated;
  }

  /**
   * Override softDelete method to validate deployment can be deleted
   * Prevents deleting deployments that are currently running
   */
  async softDelete(
    id: ObjectId,
    context: RequestContext
  ): Promise<Deployment | null> {
    const deployment = await this.deploymentModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!deployment) {
      throw new BadRequestException(`Deployment with ID ${id} not found`);
    }

    // Check if deployment is running
    if (deployment.status === 'running' || deployment.status === 'deploying') {
      throw new ConflictException(
        `Cannot delete deployment "${deployment.name}". It is currently in '${deployment.status}' status. Please stop it first.`
      );
    }

    // Call parent softDelete method
    const deleted = await super.softDelete(id, context);

    // TODO: Emit event to queue for cleanup
    // await this.deploymentProducer.emitDeploymentDeleted(id);

    return deleted;
  }

  /**
   * Validate status transition is allowed
   * @param currentStatus - Current deployment status
   * @param newStatus - New status to transition to
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): void {
    const validTransitions: Record<string, string[]> = {
      queued: ['deploying', 'failed', 'stopped'],
      deploying: ['running', 'failed', 'error'],
      running: ['stopping', 'error'],
      stopping: ['stopped', 'error'],
      stopped: ['deploying'], // Can redeploy
      failed: ['deploying'], // Can retry
      error: ['deploying', 'stopped'], // Can retry or stop
    };

    const allowedStatuses = validTransitions[currentStatus] || [];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedStatuses.join(
          ', '
        )}`
      );
    }
  }

  /**
   * Start a deployment (change status from stopped/failed to deploying)
   * This is a placeholder for future implementation
   */
  async startDeployment(
    id: ObjectId,
    context: RequestContext
  ): Promise<Deployment | null> {
    const deployment = await this.deploymentModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!deployment) {
      throw new BadRequestException(`Deployment with ID ${id} not found`);
    }

    if (deployment.status === 'running') {
      throw new BadRequestException(
        `Deployment "${deployment.name}" is already running`
      );
    }

    // Update status to deploying
    const updated = await this.update(id, { status: 'deploying' }, context);

    // TODO: Emit event to queue for deployment process
    // await this.deploymentProducer.emitDeploymentStartRequested(id);

    return updated;
  }

  /**
   * Stop a deployment (change status from running to stopping)
   * This is a placeholder for future implementation
   */
  async stopDeployment(
    id: ObjectId,
    context: RequestContext
  ): Promise<Deployment | null> {
    const deployment = await this.deploymentModel
      .findOne({
        _id: id,
        isDeleted: false,
      })
      .lean()
      .exec();

    if (!deployment) {
      throw new BadRequestException(`Deployment with ID ${id} not found`);
    }

    if (deployment.status !== 'running') {
      throw new BadRequestException(
        `Cannot stop deployment "${deployment.name}". Current status: ${deployment.status}`
      );
    }

    // Update status to stopping
    const updated = await this.update(id, { status: 'stopping' }, context);

    // TODO: Emit event to queue for stop process
    // await this.deploymentProducer.emitDeploymentStopRequested(id);

    return updated;
  }

  /**
   * Override findAll to handle statistics aggregation
   */
  async findAll(
    options: FindManyOptions,
    context: RequestContext
  ): Promise<FindManyResult<Deployment>> {
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
}
