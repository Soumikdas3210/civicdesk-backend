import { Injectable } from '@nestjs/common';
import { AiService } from './ai.interface';

@Injectable()
export class FakeAiService implements AiService {
  async suggestTriage() {
    return { categoryId: null, priority: null };
  }
  async summarizeThread() {
    return 'This is a canned summary for testing.';
  }
  async suggestReply() {
    return 'Thank you for the update, we are looking into this.';
  }
}