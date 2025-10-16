import { ApiProperty } from '@nestjs/swagger';

export class ProductSummaryReportDto {
  @ApiProperty({ description: 'Report type', example: 'product-summary' })
  reportType: string;

  @ApiProperty({ description: 'Report generation status', example: 'queued' })
  status: string;

  @ApiProperty({ description: 'Message', example: 'Report generation has been queued' })
  message: string;
}

export class ReportJobData {
  reportType: string;
  timestamp: Date;
}
