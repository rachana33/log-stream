import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { LogsModule } from './logs/logs.module';
import { AiModule } from './ai/ai.module';

import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, LogsModule, AiModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
