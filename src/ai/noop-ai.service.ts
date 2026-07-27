import { Injectable } from '@nestjs/common';
import { AiService, TriageInput, TriageSuggestion } from './ai.interface';

@Injectable()
export class NoopAiService implements AiService {
  suggestTriage(input: TriageInput): Promise<TriageSuggestion | null> {
    void input;
    return Promise.resolve(null);
  }

  summarizeThread(messages: { author: string; body: string }[]): Promise<string | null> {
    void messages;
    return Promise.resolve(null);
  }

  suggestReply(context: string): Promise<string | null> {
    void context;
    return Promise.resolve(null);
  }
}