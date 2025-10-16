import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ProductModule } from '../product/product.module';
import { CategoryModule } from '../category/category.module';
import { QueueModule } from '../../queues/queue.module';

@Module({
  imports: [ProductModule, CategoryModule, QueueModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
