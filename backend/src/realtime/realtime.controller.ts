import { Controller, Post, Get } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

@Controller('realtime')
export class RealtimeController {
    constructor(private readonly realtimeService: RealtimeService) { }

    @Post('negotiate') // Commonly used
    negotiate() {
        return this.realtimeService.getNegotiateInfo();
    }

    @Get('negotiate') // For easier browser testing/some clients
    negotiateGet() {
        return this.realtimeService.getNegotiateInfo();
    }
}
