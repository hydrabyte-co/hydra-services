/**
 * GPU Mode Enum
 * Defines how GPU is allocated to VMs/Containers
 */
export enum GPUMode {
  PASSTHROUGH = 'passthrough', // Full GPU passthrough to VM
  MIG = 'mig',                // Multi-Instance GPU (NVIDIA MIG)
}

/**
 * Common MIG profiles
 * Reference: https://docs.nvidia.com/datacenter/tesla/mig-user-guide/
 */
export const MIG_PROFILES = [
  '1g.5gb',   // 1 GPU instance, 5GB memory
  '1g.10gb',  // 1 GPU instance, 10GB memory
  '2g.10gb',  // 2 GPU instances, 10GB memory
  '3g.20gb',  // 3 GPU instances, 20GB memory
  '4g.20gb',  // 4 GPU instances, 20GB memory
  '7g.40gb',  // 7 GPU instances, 40GB memory (full GPU)
] as const;

export type MIGProfile = typeof MIG_PROFILES[number];

/**
 * Network IP Mode Enum
 */
export enum IPMode {
  STATIC = 'static', // Static IP configuration
  DHCP = 'dhcp',    // DHCP auto-assignment
}
