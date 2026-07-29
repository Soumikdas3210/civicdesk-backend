import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { AiService } from './ai.interface';
import { Priority } from 'src/common/enums';

@Injectable()
export class GeminiAiService implements AiService {
  private readonly logger = new Logger(GeminiAiService.name);
  private readonly model: GenerativeModel;

  constructor(cfg: ConfigService) {
    const client = new GoogleGenerativeAI(cfg.get<string>('GEMINI_API_KEY') ?? '');
    this.model = client.getGenerativeModel({
      model: cfg.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash',
    });
  }

  async suggestTriage(input: {
    title: string;
    description: string;
    categories: { id: string; name: string }[];
  }) {
    return this.safeCall(async () => {
      const prompt = `Grievance titled "${input.title}", described as "${input.description}". Pick the best category id from: ${JSON.stringify(input.categories)} and a priority (LOW, MEDIUM, HIGH, URGENT). Respond ONLY with JSON: {"categoryId": string, "priority": string}`;
      const result = await this.model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text());
      return { categoryId: parsed.categoryId ?? null, priority: (parsed.priority as Priority) ?? null };
    });
  }

  async summarizeThread(messages: { author: string; body: string }[]) {
    return this.safeCall(async () => {
      const thread = messages.map((m) => `${m.author}: ${m.body}`).join('\n');
      const result = await this.model.generateContent(
        `Summarize this grievance conversation in two or three sentences:\n${thread}`,
      );
      return result.response.text();
    });
  }

  async suggestReply(context: string) {
    return this.safeCall(async () => {
      const result = await this.model.generateContent(
        `Draft a short, polite reply from a government officer to a citizen, given:\n${context}`,
      );
      return result.response.text();
    });
  }

  private async safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await Promise.race([
        fn(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
    } catch (err) {
      this.logger.warn(`Gemini call failed, degrading to null: ${err}`);
      return null;
    }
  }
}