import { Module } from '@nestjs/common';
import { AI_SERVICE } from './ai.interface';
import { ConfigService } from '@nestjs/config';
import { NoopAiService } from './noop-ai.service';
import { GeminiAiService } from './gemini-ai.service';

@Module({
  providers: [{ provide: AI_SERVICE,
    inject: [ConfigService],
    useFactory: (cfg: ConfigService) =>
    cfg.get('AI_ENABLED') === 'true' ? new GeminiAiService(cfg) : new NoopAiService(),
   }],
  exports: [AI_SERVICE],
})
export class AiModule {}
