import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Deployment, DeploymentDocument } from './deployment.schema';
import { CreateDeploymentDto, UpdateDeploymentDto } from './deployment.dto';
import { ModelService } from '../model/model.service';
import { NodeService } from '../node/node.service';
import { DeploymentProducer } from '../../queues/producers/deployment.producer';

@Injectable()
export class DeploymentService extends BaseService<Deployment> {

  constructor(
    @InjectModel(Deployment.name) deploymentModel: Model<DeploymentDocument>,
    private readonly modelService: ModelService,
    private readonly nodeService: NodeService,
    private readonly deploymentProducer: DeploymentProducer,
  ) {
    super(deploymentModel as any);
  }

  async create(createDeploymentDto: CreateDeploymentDto, context: RequestContext): Promise<Deployment> {
    // Validate model exists
    const model = await this.modelService.findById(new Types.ObjectId(createDeploymentDto.modelId) as any, context);
    if (!model) {
      throw new Error(`Model with ID ${createDeploymentDto.modelId} not found`);
    }

    // Validate node exists
    const node = await this.nodeService.findById(new Types.ObjectId(createDeploymentDto.nodeId) as any, context);
    if (!node) {
      throw new Error(`Node with ID ${createDeploymentDto.nodeId} not found`);
    }

    // Check node capacity
    if (node.status !== 'online') {
      throw new Error(`Node ${createDeploymentDto.nodeId} is not online`);
    }

    // BaseService handles permissions, ownership, save, and generic logging
    const saved = await super.create(createDeploymentDto, context);

    // Business-specific logging with details
    this.logger.info('Deployment created with details', {
      id: (saved as any)._id,
      deploymentId: saved.deploymentId,
      name: saved.name,
      environment: saved.environment,
      deploymentType: saved.deploymentType,
      modelId: saved.modelId,
      nodeId: saved.nodeId,
      replicas: saved.replicas,
      createdBy: context.userId
    });

    // Emit event to queue for deployment process
    await this.deploymentProducer.emitDeploymentCreated(saved);

    return saved as Deployment;
  }

  async updateDeployment(id: string, updateDeploymentDto: UpdateDeploymentDto, context: RequestContext): Promise<Deployment | null> {
    // Convert string to ObjectId for BaseService
    const objectId = new Types.ObjectId(id);
    const updated = await super.update(objectId as any, updateDeploymentDto as any, context);

    if (updated) {
      // Business-specific logging with details
      this.logger.info('Deployment updated with details', {
        id: (updated as any)._id,
        deploymentId: updated.deploymentId,
        name: updated.name,
        environment: updated.environment,
        status: updated.status,
        deploymentType: updated.deploymentType,
        modelId: updated.modelId,
        nodeId: updated.nodeId,
        replicas: updated.replicas,
        isRunning: updated.isRunning,
        totalInferences: updated.totalInferences,
        updatedBy: context.userId
      });

      // Emit event to queue
      await this.deploymentProducer.emitDeploymentUpdated(updated);
    }

    return updated as Deployment;
  }

  async remove(id: string, context: RequestContext): Promise<void> {
    // Check if deployment is running
    const deployment = await this.findById(new Types.ObjectId(id) as any, context);
    if (deployment && deployment.isRunning) {
      throw new Error(`Cannot remove running deployment ${deployment.deploymentId}. Please stop it first.`);
    }

    // BaseService handles soft delete, permissions, and generic logging
    const result = await super.softDelete(new Types.ObjectId(id) as any, context);

    if (result) {
      // Business-specific logging
      this.logger.info('Deployment soft deleted with details', {
        id,
        deletedBy: context.userId
      });

      // Emit event to queue
      await this.deploymentProducer.emitDeploymentDeleted(id);
    }
  }

  async startDeployment(id: string, context: RequestContext): Promise<Deployment> {
    const deployment = await this.findById(new Types.ObjectId(id) as any, context);
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }

    if (deployment.isRunning) {
      throw new Error(`Deployment ${deployment.deploymentId} is already running`);
    }

    // Update status to running
    const updated = await this.updateDeployment(id, {
      status: 'running',
      isRunning: true,
      lastHealthCheck: new Date()
    }, context);

    if (updated) {
      // Add deployment event
      const deploymentData = updated as Deployment;
      deploymentData.events.push({
        timestamp: new Date(),
        event: 'deployment_started',
        message: 'Deployment started successfully',
        severity: 'info'
      });

      await super.update(new Types.ObjectId(id) as any, { events: deploymentData.events }, context);

      this.logger.info('Deployment started', {
        id,
        deploymentId: deployment.deploymentId,
        nodeId: deployment.nodeId
      });

      await this.deploymentProducer.emitDeploymentStarted(deployment);
    }

    return updated!;
  }

  async stopDeployment(id: string, context: RequestContext): Promise<Deployment> {
    const deployment = await this.findById(new Types.ObjectId(id) as any, context);
    if (!deployment) {
      throw new Error(`Deployment with ID ${id} not found`);
    }

    if (!deployment.isRunning) {
      throw new Error(`Deployment ${deployment.deploymentId} is not running`);
    }

    // Update status to stopped
    const updated = await this.updateDeployment(id, {
      status: 'stopped',
      isRunning: false,
      lastHealthCheck: new Date()
    }, context);

    if (updated) {
      // Add deployment event
      const deploymentData = updated as Deployment;
      deploymentData.events.push({
        timestamp: new Date(),
        event: 'deployment_stopped',
        message: 'Deployment stopped successfully',
        severity: 'info'
      });

      await super.update(new Types.ObjectId(id) as any, { events: deploymentData.events }, context);

      this.logger.info('Deployment stopped', {
        id,
        deploymentId: deployment.deploymentId,
        nodeId: deployment.nodeId
      });

      await this.deploymentProducer.emitDeploymentStopped(deployment);
    }

    return updated!;
  }
}