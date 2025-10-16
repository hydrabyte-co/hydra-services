import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QUEUE_EVENTS } from '../../config/queue.config';
import { ReportService } from '../../modules/report/report.service';

@Processor(QUEUE_NAMES.REPORTS)
export class ReportProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportProcessor.name);

  constructor(private readonly reportService: ReportService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case QUEUE_EVENTS.REPORT_GENERATE:
        return this.handleReportGenerate(job.data);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
        return null;
    }
  }

  private async handleReportGenerate(data: any) {
    this.logger.log(`Generating report: ${data.data.reportType}`);

    try {
      const reportType = data.data.reportType;

      if (reportType === 'product-summary') {
        const filepath = await this.reportService.generateProductSummaryReport();
        this.logger.log(`Report generated successfully: ${filepath}`);
        return {
          processed: true,
          event: QUEUE_EVENTS.REPORT_GENERATE,
          filepath,
          status: 'completed'
        };
      }

      throw new Error(`Unknown report type: ${reportType}`);
    } catch (error) {
      this.logger.error(`Error generating report: ${error.message}`);
      throw error;
    }
  }
}
