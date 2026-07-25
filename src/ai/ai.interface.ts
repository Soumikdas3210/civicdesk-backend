import { Priority } from 'src/common/enums';

export interface TriageSuggestion {
  categoryId: string | null;
  priority: Priority | null;
}

export interface TriageInput {
  title: string;
  description: string;
  categories: {
    id: string;
    name: string;
  }[];
}

export interface AiService {
  suggestTriage(input: TriageInput): Promise<TriageSuggestion | null>;
}

export const AI_SERVICE = Symbol('AI_SERVICE');
