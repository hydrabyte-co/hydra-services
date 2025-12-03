/**
 * OS Image Enum
 * V1: Predefined OS images for VMs
 * V2: Will support custom image repository
 */
export enum OSImage {
  // Ubuntu LTS
  UBUNTU_22_04 = 'ubuntu-22.04',
  UBUNTU_20_04 = 'ubuntu-20.04',

  // CentOS
  CENTOS_8 = 'centos-8',
  CENTOS_7 = 'centos-7',

  // Windows Server
  WINDOWS_SERVER_2022 = 'windows-server-2022',
  WINDOWS_SERVER_2019 = 'windows-server-2019',

  // Debian
  DEBIAN_12 = 'debian-12',
  DEBIAN_11 = 'debian-11',
}

/**
 * Get display name for OS image
 */
export const OS_IMAGE_DISPLAY_NAMES: Record<OSImage, string> = {
  [OSImage.UBUNTU_22_04]: 'Ubuntu 22.04 LTS (Jammy)',
  [OSImage.UBUNTU_20_04]: 'Ubuntu 20.04 LTS (Focal)',
  [OSImage.CENTOS_8]: 'CentOS 8',
  [OSImage.CENTOS_7]: 'CentOS 7',
  [OSImage.WINDOWS_SERVER_2022]: 'Windows Server 2022',
  [OSImage.WINDOWS_SERVER_2019]: 'Windows Server 2019',
  [OSImage.DEBIAN_12]: 'Debian 12 (Bookworm)',
  [OSImage.DEBIAN_11]: 'Debian 11 (Bullseye)',
};
