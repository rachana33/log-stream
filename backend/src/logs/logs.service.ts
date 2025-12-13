import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';
import { EventHubProducerClient } from '@azure/event-hubs';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class LogsService implements OnModuleInit, OnModuleDestroy {
  private producer: EventHubProducerClient;
  private readonly logger = new Logger(LogsService.name);

  constructor(private readonly realtimeService: RealtimeService) { }

  onModuleInit() {
    const connectionString = process.env.AZURE_EVENTHUB_CONN_STR;
    const eventHubName = process.env.AZURE_EVENTHUB_NAME;

    if (connectionString && eventHubName) {
      this.producer = new EventHubProducerClient(connectionString, eventHubName);
      this.logger.log('Event Hub Producer initialized');
    } else {
      this.logger.warn('Event Hub configuration missing (AZURE_EVENTHUB_CONN_STR or AZURE_EVENTHUB_NAME)');
    }
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.close();
    }
  }

  async create(createLogDto: CreateLogDto) {
    // Broadcast immediately (fire and forget)
    this.realtimeService.broadcastLog(createLogDto).catch(err => {
      this.logger.error('Failed to broadcast log', err);
    });

    if (this.producer) {
      try {
        const batch = await this.producer.createBatch();
        const added = batch.tryAdd({ body: createLogDto });
        if (!added) {
          throw new Error('Message too large to fit in batch');
        }
        await this.producer.sendBatch(batch);
        return { status: 'ingested', log: createLogDto };
      } catch (error) {
        this.logger.error(`Failed to send to Event Hub: ${error.message}`);
        throw error;
      }
    }
    // Fallback or dev mode
    this.logger.log('Log received (no Event Hub): ' + JSON.stringify(createLogDto));
    return { status: 'received_local', log: createLogDto };
  }

  findAll() {
    return `This action returns all logs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} log`;
  }

  update(id: number, updateLogDto: UpdateLogDto) {
    return `This action updates a #${id} log`;
  }

  remove(id: number) {
    return `This action removes a #${id} log`;
  }
}
