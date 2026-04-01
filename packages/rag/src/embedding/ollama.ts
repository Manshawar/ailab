export type EmbeddingVector = number[];

export class OllamaEmbedder {
  private cache = new Map<string, EmbeddingVector>();

  constructor(
    private baseUrl: string = "http://localhost:11434",
    private model: string = "bge-m3:latest",
  ) {}

  private clean(text: string): string {
    return text.replace(/\s+/g, " ").trim();
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const cleaned = this.clean(text);
    if (this.cache.has(cleaned)) {
      return this.cache.get(cleaned)!;
    }

    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: cleaned,
      }),
    });
    const data = await res.json();
    const embedding = Array.isArray(data.embeddings?.[0])
      ? data.embeddings[0]
      : data.embeddings;

    this.cache.set(cleaned, embedding);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const cleaned = texts.map((text) => this.clean(text));
    const uncached = cleaned.filter((text, index, arr) => {
      return !this.cache.has(text) && arr.indexOf(text) === index;
    });

    if (uncached.length > 0) {
      const res = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          input: uncached,
        }),
      });
      const data = await res.json();

      uncached.forEach((text, i) => {
        this.cache.set(text, data.embeddings[i]);
      });
    }

    return cleaned.map((text) => this.cache.get(text)!);
  }
}
