import { INestApplication, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const datasourceUrl = process.env.DATABASE_URL;
    if (!datasourceUrl) {
      // Prisma v7 requires runtime datasource configuration when datasource.url is not in schema.prisma.
      // We fail fast with a clear error so the app doesn't crash with a vague PrismaClientInitializationError.
      throw new Error('DATABASE_URL is not set. Add it to backend/.env to enable Prisma.');
    }

    const pool = new Pool({ connectionString: datasourceUrl });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      this.logger.warn(
        'Prisma failed to connect on startup. Continuing without DB connectivity (local fallback logs may be unavailable).',
      );
    }
  }

  async enableShutdownHooks(app: INestApplication): Promise<void> {
    // Prisma Client v7 types no longer include the 'beforeExit' event in the typed $on API.
    // We still want a graceful shutdown in Nest, so we register the hook via an any-cast.
    (this as any).$on('beforeExit', async () => {
      await app.close();
    });
  }
}
