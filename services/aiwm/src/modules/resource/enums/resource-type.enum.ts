/**
 * Resource Type Enum
 * Defines the types of resources that can be managed
 */
export enum ResourceType {
  INFERENCE_CONTAINER = 'inference-container',    // AI model inference (existing from Deployment)
  APPLICATION_CONTAINER = 'application-container', // User applications (nginx, postgres, etc.)
  VIRTUAL_MACHINE = 'virtual-machine',            // VMs via libvirt/KVM
}

/**
 * Resource Status Enum
 * Lifecycle states of a resource
 */
export enum ResourceStatus {
  QUEUED = 'queued',       // Created but not yet deployed
  DEPLOYING = 'deploying', // Deployment in progress
  RUNNING = 'running',     // Successfully deployed and running
  STOPPING = 'stopping',   // Stop command issued
  STOPPED = 'stopped',     // Successfully stopped
  FAILED = 'failed',       // Deployment or operation failed
  ERROR = 'error',         // Runtime error
}
