import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductSummaryReportDto } from './report.dto';
import { ReportProducer } from '../../queues/producers/report.producer';
import { createLogger } from '@hydrabyte/shared';

@ApiTags('reports')
@Controller('reports')
export class ReportController {
  private readonly logger = createLogger('ReportController');

  constructor(private readonly reportProducer: ReportProducer) {}

  @Post('product-summary')
  @ApiOperation({
    summary: 'Generate product summary report',
    description: 'Queue a job to generate product summary report and save to local file'
  })
  @ApiResponse({ status: 201, description: 'Report generation queued successfully', type: ProductSummaryReportDto })
  async generateProductSummary(): Promise<ProductSummaryReportDto> {
    this.logger.info('Report generation requested', { reportType: 'product-summary' });

    const job = await this.reportProducer.emitReportGenerate('product-summary');

    this.logger.debug('Report job queued', { jobId: job.id });

    return {
      reportType: 'product-summary',
      status: 'queued',
      message: `Report generation has been queued with job ID: ${job.id}`,
    };
  }
}
