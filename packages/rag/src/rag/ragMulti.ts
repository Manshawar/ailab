import { MULTI_QUERY_PROMPT } from "../prompt/multi-query";
import { llmPrompt, type LlmOptions } from "../llm";
import { hash } from "../utils/hash";
export interface MultiQueryOptions extends LlmOptions {
  maxQueries?: number; // 默认 3~5
  cache?: boolean;
}

export interface QueryItem {
  query: string;
}
export class MultiQueryGenerator {
  private cache = new Map<string, string[]>();
  private llm;
  options: MultiQueryOptions;
  question: string;
  constructor(
    question: string,
    options: MultiQueryOptions = {
      maxQueries: 4,
      cache: true,
      temperature: 0.3,
      maxTokens: 1000,
    }
  ) {
    this.llm = llmPrompt;
    this.question = question;
    this.options = options;

  }

  async generate(query: string = this.question, options: MultiQueryOptions = this.options): Promise<string[]> {
    const { maxQueries, cache } = options;

    const cacheKey = hash(query + maxQueries);

    if (cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const prompt = MULTI_QUERY_PROMPT.replace("{query}", query).replace("{n}", String(maxQueries));

    const raw = await this.llm(prompt, { ...this.options, system: "你是信息检索优化助手" });
    const queries = this.parse(raw);

    // 👉 保证原始 query 在第一位
    const finalQueries = [query, ...queries.filter((q) => q !== query)];

    if (cache) {
      this.cache.set(cacheKey, finalQueries);
    }

    return finalQueries;
  }

  private parse(text: string): string[] {
    return text
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean)
      .slice(0, 5);
  }
}
