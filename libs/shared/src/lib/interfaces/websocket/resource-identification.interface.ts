import { ResourceType } from '../../enum/websocket';

/**
 * Resource identification for resource-based messages
 */
export interface IResourceIdentification {
  type: ResourceType;
  id: string; // Resource ID (deploymentId, modelId, jobId, etc.)
}
