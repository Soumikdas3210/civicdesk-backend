import { Module } from '@nestjs/common';
import { SlaService } from './sla.service';
import { SlaController } from './sla.controller';

@Module({
  controllers: [SlaController],
  providers: [SlaService],
})
export class SlaModule {}
