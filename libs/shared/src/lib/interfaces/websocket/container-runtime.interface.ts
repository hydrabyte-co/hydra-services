/**
 * Container runtime information
 */
export interface IContainerRuntime {
  type: 'docker' | 'containerd' | 'podman';
  version: string; // '24.0.7'
  rootDir: string; // '/var/lib/docker'
}

/**
 * Container information
 */
export interface IContainerInfo {
  containerId: string;
  containerName: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting';
  createdAt: string; // ISO 8601
  startedAt?: string; // ISO 8601
  ports?: Record<string, number>; // Internal port -> external port
}
