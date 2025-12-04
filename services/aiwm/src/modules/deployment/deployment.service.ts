import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { BaseService, FindManyOptions, FindManyResult } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Deployment } from './deployment.schema';
import { Model as ModelEntity } from '../model/model.schema';
import { Node } from '../node/node.schema';
import { Resource } from '../resource/resource.schema';

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
    @InjectModel(Node.name) private readonly nodeModel: Model<Node>,
    @InjectModel(Resource.name) private readonly resourceModel: Model<Resource>
  ) {
    super(deploymentModel);
  }

  /**
   * Override create method to validate model, node, and resource before deployment
   * - Model must exist and status = 'active'
   * - Node must exist and status = 'online'
   * - Resource must exist and resourceType = 'inference-container'
   */
  async create(
    createData: Partial<Deployment>,
    context: RequestContext
  ): Promise<Deployment | null> {
    const { modelId, nodeId, resourceId } = createData;

    if (!modelId || !nodeId || !resourceId) {
      throw new BadRequestException(
        'modelId, nodeId, and resourceId are required'
      );
    }

    // Validate Model exists and is active
    const model = await this.modelModel
      .findById(modelId)
      .where('isDeleted')
      .equals(false)
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
      .findById(nodeId)
      .where('isDeleted')
      .equals(false)
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

    // Validate Resource exists and is inference-container
    const resource = await this.resourceModel
      .findById(resourceId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!resource) {
      throw new BadRequestException(
        `Resource with ID ${resourceId} not found`
      );
    }

    if (resource.resourceType !== 'inference-container') {
      throw new BadRequestException(
        `Resource "${resource.name}" must be of type 'inference-container'. Current type: ${resource.resourceType}`
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

  /**
   * Get deployment endpoint by resolving resource and node
   * Builds endpoint URL from node IP and resource container port
   * @param deploymentId - Deployment ID (as string)
   * @returns Endpoint URL (e.g., "http://172.16.3.20:10060")
   */
  async getDeploymentEndpoint(deploymentId: string): Promise<string> {
    // Get deployment
    const deployment = await this.deploymentModel
      .findById(deploymentId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!deployment) {
      throw new NotFoundException(
        `Deployment with ID ${deploymentId} not found`
      );
    }

    // Get resource
    const resource = await this.resourceModel
      .findById(deployment.resourceId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!resource) {
      throw new NotFoundException(
        `Resource with ID ${deployment.resourceId} not found`
      );
    }

    // Get node
    const node = await this.nodeModel
      .findById(deployment.nodeId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!node) {
      throw new NotFoundException(
        `Node with ID ${deployment.nodeId} not found`
      );
    }

    // Extract port from resource (first port mapping)
    const containerPorts = resource.config?.containerPorts;
    if (!containerPorts || containerPorts.length === 0) {
      throw new BadRequestException(
        `Resource "${resource.name}" has no container ports configured`
      );
    }

    const hostPort = containerPorts[0].hostPort;

    // Build endpoint URL
    const endpoint = `http://${node.ipAddress}:${hostPort}`;

    return endpoint;
  }

  /**
   * Get resource and node info for a deployment
   * Used by controllers to get container details
   */
  async getDeploymentDetails(deploymentId: string): Promise<{
    deployment: any;
    resource: any;
    node: any;
    endpoint: string;
  }> {
    const deployment = await this.deploymentModel
      .findById(deploymentId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!deployment) {
      throw new NotFoundException(
        `Deployment with ID ${deploymentId} not found`
      );
    }

    const resource = await this.resourceModel
      .findById(deployment.resourceId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!resource) {
      throw new NotFoundException(
        `Resource with ID ${deployment.resourceId} not found`
      );
    }

    const node = await this.nodeModel
      .findById(deployment.nodeId)
      .where('isDeleted')
      .equals(false)
      .lean()
      .exec();

    if (!node) {
      throw new NotFoundException(
        `Node with ID ${deployment.nodeId} not found`
      );
    }

    const endpoint = await this.getDeploymentEndpoint(deploymentId);

    return { deployment, resource, node, endpoint };
  }
}
