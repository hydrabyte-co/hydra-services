import { Module } from '@nestjs/common';
import { CategoryProcessor } from './processors/category.processor';
import { ProductProcessor } from './processors/product.processor';
import { ReportProcessor } from './processors/report.processor';
import { ReportModule } from '../modules/report/report.module';

@Module({
  imports: [ReportModule],
  providers: [CategoryProcessor, ProductProcessor, ReportProcessor],
})
export class ProcessorsModule {}
