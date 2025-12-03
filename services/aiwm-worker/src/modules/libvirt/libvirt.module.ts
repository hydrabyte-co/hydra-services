import { Module } from '@nestjs/common';
import { LibvirtService } from './libvirt.service';

@Module({
  providers: [LibvirtService],
  exports: [LibvirtService],
})
export class LibvirtModule {}
