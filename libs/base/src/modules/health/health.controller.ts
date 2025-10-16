import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

interface CustomHealthResponse {
  status: string;
  info: {
    version: string;
    gitCommit: string;
    uptime: number;
    environment: string;
  };
  details: {
    database: {
      status: string;
    };
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Check service health status including database and system info'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          version: '1.0.0',
          gitCommit: '1acbbb8',
          uptime: 3600.5,
          environment: 'production'
        },
        details: {
          database: {
            status: 'up'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 503,
    description: 'Service is unhealthy'
  })
  async check(): Promise<CustomHealthResponse> {
    const healthCheckResult = await this.health.check([
      () => this.db.pingCheck('database', { timeout: 300 }),
      () => this.healthService.getSystemInfo(),
    ]);

    // Extract system info from nested structure
    const systemInfo = healthCheckResult.info?.['info'] || healthCheckResult.details?.['info'];

    // Build clean response structure
    const response: CustomHealthResponse = {
      status: healthCheckResult.status,
      info: {
        version: systemInfo?.['version'] || '1.0.0',
        gitCommit: systemInfo?.['gitCommit'] || 'unknown',
        uptime: systemInfo?.['uptime'] || 0,
        environment: systemInfo?.['environment'] || 'development',
      },
      details: {
        database: healthCheckResult.details?.['database'] || { status: 'unknown' },
      },
    };

    return response;
  }
}
