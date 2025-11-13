import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';

@Injectable()
export class DeploymentProducer {
  constructor(
    @InjectQueue(QUEUE_NAMES.DEPLOYMENTS) private deploymentQueue: Queue,
  ) {}

  async emitDeploymentCreated(deployment: any) {
    await this.deploymentQueue.add(QUEUE_EVENTS.DEPLOYMENT_CREATED, {
      event: QUEUE_EVENTS.DEPLOYMENT_CREATED,
      data: deployment,
      timestamp: new Date().toISOString(),
    });
  }

  async emitDeploymentUpdated(deployment: any) {
    await this.deploymentQueue.add(QUEUE_EVENTS.DEPLOYMENT_UPDATED, {
      event: QUEUE_EVENTS.DEPLOYMENT_UPDATED,
      data: deployment,
      timestamp: new Date().toISOString(),
    });
  }

  async emitDeploymentDeleted(deploymentId: string) {
    await this.deploymentQueue.add(QUEUE_EVENTS.DEPLOYMENT_DELETED, {
      event: QUEUE_EVENTS.DEPLOYMENT_DELETED,
      data: { id: deploymentId },
      timestamp: new Date().toISOString(),
    });
  }

  async emitDeploymentStarted(deployment: any) {
    await this.deploymentQueue.add(QUEUE_EVENTS.DEPLOYMENT_STARTED, {
      event: QUEUE_EVENTS.DEPLOYMENT_STARTED,
      data: deployment,
      timestamp: new Date().toISOString(),
    });
  }

  async emitDeploymentStopped(deployment: any) {
    await this.deploymentQueue.add(QUEUE_EVENTS.DEPLOYMENT_STOPPED, {
      event: QUEUE_EVENTS.DEPLOYMENT_STOPPED,
      data: deployment,
      timestamp: new Date().toISOString(),
    });
  }
}