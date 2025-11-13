import { Module } from '@nestjs/common';
import { WebSocketClientService } from './websocket-client.service';
import { HardwareModule } from '../hardware/hardware.module';

@Module({
  imports: [HardwareModule],
  providers: [WebSocketClientService],
  exports: [WebSocketClientService],
})
export class WebSocketClientModule {}
