import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';
import { EventHubProducerClient } from '@azure/event-hubs';
import { RealtimeService } from '../realtime/realtime.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogsService implements OnModuleInit, OnModuleDestroy {
  private producer: EventHubProducerClient;
  private readonly logger = new Logger(LogsService.name);

  private inMemoryLogs: any[] = [];

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly prisma: PrismaService,
  ) { }

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
    // 1. Broadcast (Realtime)
    this.realtimeService.broadcastLog(createLogDto).catch((err) => {
      this.logger.error('Failed to broadcast log', err);
    });

    // 2. In-Memory Write (Always works for demo)
    const logWithId = {
      ...createLogDto,
      id: Date.now(),
      createdAt: createLogDto.timestamp ? new Date(createLogDto.timestamp) : new Date()
    };
    this.inMemoryLogs.unshift(logWithId);
    if (this.inMemoryLogs.length > 200) this.inMemoryLogs.pop(); // Keep size manageable

    // 3. Persist to DB (Best effort)
    try {
      await this.prisma.log.create({
        data: {
          source: createLogDto.source,
          message: createLogDto.message,
          severity: createLogDto.severity,
          metadata: createLogDto.metadata ?? {},
          createdAt: logWithId.createdAt,
        },
      });
    } catch (e) {
      this.logger.warn(`Failed to save log to DB (${e.code || e.name}). Using in-memory fallback.`);
    }

    // 4. Ingest to Event Hub (Reliability)
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
      }
    }
    return { status: 'ingested_local_only', log: createLogDto };
  }

  async findAll() {
    try {
      // Try DB first
      return await this.prisma.log.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      this.logger.warn('DB unavailable, returning in-memory logs');
      return this.inMemoryLogs.slice(0, 50);
    }
  }

  async getSeverityStats() {
    try {
      const group = await this.prisma.log.groupBy({
        by: ['severity'],
        _count: { severity: true },
      });
      return group.map((g) => ({ severity: g.severity, count: g._count.severity }));
    } catch (e) {
      // In-memory stats
      const counts: Record<string, number> = {};
      for (const l of this.inMemoryLogs) {
        counts[l.severity] = (counts[l.severity] || 0) + 1;
      }
      return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
    }
  }

  findOne(id: number) {
    return this.prisma.log.findUnique({ where: { id } });
  }

  update(id: number, updateLogDto: UpdateLogDto) {
    return `This action updates a #${id} log`;
  }

  remove(id: number) {
    return `This action removes a #${id} log`;
  }
}
