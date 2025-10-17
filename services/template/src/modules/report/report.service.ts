import { Injectable } from '@nestjs/common';
import { ProductService } from '../product/product.service';
import { CategoryService } from '../category/category.service';
import { createLogger, RequestContext } from '@hydrabyte/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ReportService {
  private readonly logger = createLogger('ReportService');

  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {}

  async generateProductSummaryReport(context: RequestContext): Promise<string> {
    this.logger.info('Starting product summary report generation');

    // Get all categories and products with large limit for report
    const categoriesResult = await this.categoryService.findAll({ limit: 1000 }, context);
    const productsResult = await this.productService.findAll({ limit: 10000 }, context);

    const categories = categoriesResult.data;
    const products = productsResult.data;

    this.logger.debug('Data collected for report', {
      categoriesCount: categories.length,
      productsCount: products.length
    });

    // Build report data
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCategories: categories.length,
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
      },
      categoriesDetail: await Promise.all(
        categories.map(async (category) => {
          const categoryProductsResult = await this.productService.findByCategory(
            (category as any)['_id'].toString(),
            { limit: 10000 },
            context
          );
          const categoryProducts = categoryProductsResult.data;

          return {
            categoryId: (category as any)['_id'],
            categoryName: category.name,
            productsCount: categoryProducts.length,
            totalStock: categoryProducts.reduce((sum, p) => sum + p.stock, 0),
            totalValue: categoryProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
            products: categoryProducts.map((p) => ({
              id: (p as any)['_id'],
              name: p.name,
              price: p.price,
              stock: p.stock,
              value: p.price * p.stock,
            })),
          };
        })
      ),
    };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `product-summary-${timestamp}.json`;
    const reportsDir = path.join(process.cwd(), 'services', 'template', 'reports');
    const filepath = path.join(reportsDir, filename);

    // Ensure reports directory exists
    await fs.mkdir(reportsDir, { recursive: true });

    // Write report to file
    await fs.writeFile(filepath, JSON.stringify(reportData, null, 2), 'utf-8');

    this.logger.info('Report generated successfully', {
      filepath,
      filename,
      totalCategories: reportData.summary.totalCategories,
      totalProducts: reportData.summary.totalProducts,
      totalValue: reportData.summary.totalValue
    });

    return filepath;
  }
}
