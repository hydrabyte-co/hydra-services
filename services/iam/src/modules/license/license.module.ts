import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { License, LicenseSchema } from './license.schema';
import {
  Organization,
  OrganizationSchema,
} from '../organization/organization.schema';

/**
 * License Module
 *
 * Manages organization licenses for service access control.
 * Exports LicenseService for use in other modules (e.g., Auth module for JWT payload).
 *
 * Dependencies:
 * - License model for CRUD operations
 * - Organization model for validation
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: License.name, schema: LicenseSchema },
      { name: Organization.name, schema: OrganizationSchema },
    ]),
  ],
  controllers: [LicenseController],
  providers: [LicenseService],
  exports: [LicenseService], // Export for use in auth module
})
export class LicenseModule {}
