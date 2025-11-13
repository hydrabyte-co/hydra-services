import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HardwareModule } from './modules/hardware/hardware.module';
import { WebSocketClientModule } from './modules/websocket/websocket-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HardwareModule,
    WebSocketClientModule,
  ],
})
export class AppModule {}
