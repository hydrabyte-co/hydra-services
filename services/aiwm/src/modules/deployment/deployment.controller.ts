import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
  Req,
  Res,
  All,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto, ApiCreateErrors, ApiReadErrors, ApiUpdateErrors, ApiDeleteErrors } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { Request, Response } from 'express';
import { DeploymentService } from './deployment.service';
import { CreateDeploymentDto, UpdateDeploymentDto } from './deployment.dto';
import { ProxyService } from './proxy.service';

@ApiTags('Deployments')
@ApiBearerAuth()
@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(
    private readonly deploymentService: DeploymentService,
    private readonly proxyService: ProxyService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully with status "queued"' })
  @ApiCreateErrors()
  async create(
    @Body() createDto: CreateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    // IDs are now stored as strings, no conversion needed
    return this.deploymentService.create(createDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'List all deployments with pagination' })
  @ApiReadErrors({ notFound: false })
  async findAll(
    @Query() query: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.findAll(query, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deployment by ID' })
  @ApiReadErrors()
  async findById(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const deployment = await this.deploymentService.findById(id as any, context);
    if (!deployment) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return deployment;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update deployment' })
  @ApiResponse({ status: 200, description: 'Deployment updated successfully. Status transitions are validated.' })
  @ApiUpdateErrors()
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeploymentDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.deploymentService.update(id as any, updateDto as any, context);
    if (!updated) {
      throw new NotFoundException(`Deployment with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete deployment' })
  @ApiResponse({ status: 200, description: 'Deployment deleted successfully. Cannot delete running/deploying deployments.' })
  @ApiDeleteErrors()
  async delete(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.softDelete(id as any, context);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a deployment' })
  @ApiResponse({ status: 200, description: 'Deployment start initiated. Status changed to "deploying".' })
  @ApiUpdateErrors()
  async start(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.startDeployment(id as any, context);
  }

  @Post(':id/stop')
  @ApiOperation({ summary: 'Stop a running deployment' })
  @ApiResponse({ status: 200, description: 'Deployment stop initiated. Status changed to "stopping".' })
  @ApiUpdateErrors()
  async stop(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    return this.deploymentService.stopDeployment(id as any, context);
  }

  // ========================================================================
  // Proxy Endpoints
  // ========================================================================

  @Get(':id/api-spec')
  @ApiOperation({
    summary: 'Get OpenAPI specification from deployment endpoint',
    description: 'Fetches the OpenAPI spec from the model inference endpoint (endpoint/openapi.json)',
  })
  @ApiResponse({ status: 200, description: 'OpenAPI specification returned' })
  @ApiResponse({ status: 400, description: 'Deployment not running or no endpoint configured' })
  @ApiResponse({ status: 404, description: 'Deployment or OpenAPI spec not found' })
  @ApiResponse({ status: 502, description: 'Endpoint unreachable' })
  @ApiResponse({ status: 504, description: 'Request timeout' })
  async getApiSpec(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    // 1. Get deployment details (includes resource, node, and built endpoint)
    const { deployment, endpoint } = await this.deploymentService.getDeploymentDetails(id);

    // 2. Check if deployment is running
    if (deployment.status !== 'running') {
      throw new BadRequestException(
        `Deployment is not running (status: ${deployment.status})`,
      );
    }

    // 3. Fetch OpenAPI spec from endpoint
    try {
      const apiSpec = await this.proxyService.fetchJson(
        `${endpoint}/openapi.json`,
        { timeout: 10000 },
      );

      return apiSpec;
    } catch (error: any) {
      if (error.message === 'ENDPOINT_UNREACHABLE') {
        throw new BadGatewayException('Endpoint is not reachable');
      } else if (error.message === 'ENDPOINT_TIMEOUT') {
        throw new BadGatewayException('Request timeout');
      } else if (error.message === 'RESOURCE_NOT_FOUND') {
        throw new NotFoundException('OpenAPI spec not found at endpoint');
      } else {
        throw new BadGatewayException(
          `Failed to fetch API spec: ${error.message}`,
        );
      }
    }
  }

  @All(':id/inference/*')
  @ApiOperation({
    summary: 'Proxy requests to deployment inference endpoint',
    description:
      'Forwards all HTTP requests to the model inference endpoint. ' +
      'Preserves method, headers, body, and query parameters. ' +
      'Example: POST /deployments/{id}/inference/v1/chat/completions',
  })
  @ApiResponse({ status: 200, description: 'Request proxied successfully' })
  @ApiResponse({ status: 400, description: 'Deployment not running or no endpoint' })
  @ApiResponse({ status: 404, description: 'Deployment not found' })
  @ApiResponse({ status: 502, description: 'Endpoint unreachable or proxy error' })
  @ApiResponse({ status: 504, description: 'Request timeout' })
  async proxyInference(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() context: RequestContext,
  ) {
    try {
      // 1. Get deployment details (includes resource, node, and built endpoint)
      const { deployment, endpoint } = await this.deploymentService.getDeploymentDetails(id);

      // 2. Check if deployment is running
      if (deployment.status !== 'running') {
        return res.status(400).json({
          statusCode: 400,
          message: `Deployment is not running (status: ${deployment.status})`,
          error: 'Bad Request',
        });
      }

      // 3. Extract path after /inference
      const basePath = `/deployments/${id}/inference`;
      const originalUrl = req.originalUrl || req.url;
      const pathIndex = originalUrl.indexOf(basePath);

      if (pathIndex === -1) {
        return res.status(500).json({
          statusCode: 500,
          message: 'Failed to extract target path',
          error: 'Internal Server Error',
        });
      }

      const targetPath = originalUrl.substring(pathIndex + basePath.length);

      // 4. Build target URL from resolved endpoint
      const targetUrl = `${endpoint}${targetPath}`;

      // 5. Proxy request
      await this.proxyService.proxyRequest(targetUrl, req, res, {
        timeout: 300000, // 5 minutes for inference
      });
    } catch (error: any) {
      // Handle errors from getDeploymentDetails
      if (error.name === 'NotFoundException') {
        return res.status(404).json({
          statusCode: 404,
          message: error.message,
          error: 'Not Found',
        });
      }
      return res.status(500).json({
        statusCode: 500,
        message: error.message || 'Internal server error',
        error: 'Internal Server Error',
      });
    }
  }
}
