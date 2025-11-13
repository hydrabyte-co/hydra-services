/**
 * Operating System information
 */
export interface IOsInfo {
  platform: 'linux' | 'darwin' | 'win32';
  distro: string; // 'Ubuntu', 'CentOS', 'Windows Server', 'macOS'
  version: string; // '22.04 LTS', '11.0'
  arch: 'x64' | 'arm64';
  kernel: string; // '5.15.0-91-generic'
}
