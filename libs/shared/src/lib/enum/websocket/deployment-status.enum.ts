/**
 * Deployment lifecycle status
 */
export enum DeploymentStatus {
  QUEUED = 'queued',         // Waiting for resources
  STARTING = 'starting',     // Container is starting
  RUNNING = 'running',       // Running normally
  STOPPING = 'stopping',     // Shutting down
  STOPPED = 'stopped',       // Stopped
  FAILED = 'failed',         // Error occurred
  RESTARTING = 'restarting', // Restarting
}

/**
 * Valid status transitions
 */
export const DEPLOYMENT_STATUS_TRANSITIONS: Record<
  DeploymentStatus,
  DeploymentStatus[]
> = {
  [DeploymentStatus.QUEUED]: [DeploymentStatus.STARTING, DeploymentStatus.FAILED],
  [DeploymentStatus.STARTING]: [DeploymentStatus.RUNNING, DeploymentStatus.FAILED],
  [DeploymentStatus.RUNNING]: [
    DeploymentStatus.STOPPING,
    DeploymentStatus.RESTARTING,
    DeploymentStatus.FAILED,
  ],
  [DeploymentStatus.STOPPING]: [DeploymentStatus.STOPPED],
  [DeploymentStatus.STOPPED]: [DeploymentStatus.STARTING], // Can restart
  [DeploymentStatus.FAILED]: [DeploymentStatus.STARTING], // Can retry
  [DeploymentStatus.RESTARTING]: [
    DeploymentStatus.RUNNING,
    DeploymentStatus.FAILED,
  ],
};
