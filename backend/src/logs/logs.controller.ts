import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { UpdateLogDto } from './dto/update-log.dto';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) { }

  @Post('ingest')
  create(@Body() createLogDto: CreateLogDto) {
    return this.logsService.create(createLogDto);
  }

  @Get('recent')
  findAll() {
    return this.logsService.findAll();
  }

  @Get('severity-breakdown')
  getSeverityStats() {
    return this.logsService.getSeverityStats();
  }

  @Get()
  index() {
    return this.logsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.logsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLogDto: UpdateLogDto) {
    return this.logsService.update(+id, updateLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.logsService.remove(+id);
  }
}
