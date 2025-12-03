/**
 * Resource Configuration Interfaces
 * Shared between AIWM controller and worker
 */

/**
 * GPU Configuration
 */
export interface IGPUConfig {
  enabled: boolean;
  mode: 'passthrough' | 'mig';
  deviceIds?: string[];
  migProfile?: string; // e.g., '1g.5gb', '2g.10gb'
}

/**
 * Network Configuration
 */
export interface INetworkConfig {
  mode: 'bridge-vlan';
  ipMode: 'static' | 'dhcp';
  ipAddress?: string;
  netmask?: string;
  gateway?: string;
  vlanId?: number;
}

/**
 * Cloud-init Configuration
 */
export interface ICloudInit {
  hostname?: string;
  sshPublicKey?: string;
  username?: string;
  password?: string;
}

/**
 * Port Mapping (for containers)
 */
export interface IPortMapping {
  containerPort: number;
  hostPort?: number;
  protocol?: 'tcp' | 'udp';
}

/**
 * Volume Mount (for containers)
 */
export interface IVolumeMount {
  hostPath: string;
  containerPath: string;
  readOnly?: boolean;
}

/**
 * Inference Container Configuration
 */
export interface IInferenceContainerConfig {
  type: 'inference-container';
  modelId: string;
  modelPath: string;
  dockerImage: string;
  containerPort: number;
  gpuDeviceIds: string[];
  gpuMemoryLimit?: number;
  cpuCores?: number;
  ramLimit?: number;
  environment?: Record<string, string>;
  healthCheckPath?: string;
}

/**
 * Application Container Configuration
 */
export interface IApplicationContainerConfig {
  type: 'application-container';
  registry: 'docker-hub' | 'ghcr' | 'private';
  imageName: string;
  imageTag?: string;
  registryAuth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  containerPorts?: IPortMapping[];
  cpuCores?: number;
  ramLimit?: number;
  gpuDeviceIds?: string[];
  volumes?: IVolumeMount[];
  environment?: Record<string, string>;
  networkMode?: 'bridge' | 'host' | 'none';
}

/**
 * Virtual Machine Configuration
 */
export interface IVirtualMachineConfig {
  type: 'virtual-machine';
  osImage: string; // Enum value
  vcpus: number;
  ramMB: number;
  diskGB: number;
  gpuConfig?: IGPUConfig;
  networkConfig: INetworkConfig;
  cloudInit?: ICloudInit;
}

/**
 * Resource Config Union Type
 */
export type IResourceConfig =
  | IInferenceContainerConfig
  | IApplicationContainerConfig
  | IVirtualMachineConfig;

/**
 * Resource Runtime Information
 */
export interface IResourceRuntime {
  id?: string; // Container ID or VM ID
  endpoint?: string; // Access endpoint
  allocatedGPU?: string[];
  allocatedCPU?: number;
  allocatedRAM?: number;
  startedAt?: Date;
  stoppedAt?: Date;
}
