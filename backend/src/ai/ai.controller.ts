import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('insights')
  async insights(@Body() body: { logs?: unknown[] }): Promise<{ insights: string }> {
    const insights = await this.aiService.getInsights(body?.logs ?? []);
    return { insights };
  }
}
