import { Injectable } from '@nestjs/common';
import { AiService, TriageInput, TriageSuggestion } from './ai.interface';

@Injectable()
export class NoopAiService implements AiService {
  suggestTriage(input: TriageInput): Promise<TriageSuggestion | null> {
    void input; // deliberately unused, this is the no-op implementation
    return Promise.resolve(null);
  }
}
