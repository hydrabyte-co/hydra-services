import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Pii, PiiSchema } from './pii.schema';
import { PiiService } from './pii.service';
import { PiiController } from './pii.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Pii.name, schema: PiiSchema }]),
  ],
  controllers: [PiiController],
  providers: [PiiService],
  exports: [PiiService],
})
export class PiiModule {}
