import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemInfo {
  version: string;
  gitCommit: string;
  uptime: number;
  environment: string;
}

@Injectable()
export class HealthService {
  /**
   * Get system information including version, git commit, uptime, and environment
   */
  getSystemInfo(): HealthIndicatorResult {
    const version = this.getVersion();
    const gitCommit = process.env['GIT_COMMIT_SHA'] || 'unknown';
    const uptime = process.uptime();
    const environment = process.env['NODE_ENV'] || 'development';

    return {
      info: {
        status: 'up',
        version,
        gitCommit,
        uptime,
        environment,
      },
    };
  }

  /**
   * Read version from package.json at monorepo root
   */
  private getVersion(): string {
    try {
      // Navigate up to find package.json at root
      const packageJsonPath = path.resolve(__dirname, '../../../../../package.json');

      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch (error) {
      console.warn('[HealthService] Could not read package.json version:', error);
    }
    return '1.0.0';
  }
}
