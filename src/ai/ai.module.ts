import { Module } from '@nestjs/common';
import { NoopAiService } from './noop-ai.service';
import { AI_SERVICE } from './ai.interface';

@Module({
  providers: [{ provide: AI_SERVICE, useClass: NoopAiService }],
  exports: [AI_SERVICE],
})
export class AiModule {}
