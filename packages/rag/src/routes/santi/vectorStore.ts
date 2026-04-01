import * as fs from "fs";
import * as path from "path";
import { Embedding } from "./embedding";
export interface Chunk {
  id: string;
  text: string;
  embedding: number[];
  source: string;
}
export class VectorStore {
  private chunks: Chunk[] = [];
  private chunkSize = 1000;
  private readonly sourceDir: string;
  private readonly batchSize = 5;
  private readonly concurrency = 5;
  private readonly overlap = 200;
  constructor(sourceDir: string) {
    this.sourceDir = sourceDir;
    this.loadFromDirectory();
  }
  private listSourceFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const filePaths = fs
      .readdirSync(dir)
      .filter((fileName) => fileName.endsWith(".txt") || fileName.endsWith(".md"))
      .map((fileName) => path.join(dir, fileName));

    return filePaths;
  }
  private async loadFromDirectory() {
    const filePaths = this.listSourceFiles(this.sourceDir);
    if (filePaths.length === 0) {
      console.warn(`No source files found in ${this.sourceDir}`);
      this.chunks = [];
      return;
    }

    try {
      const sourceChunks: Array<{ source: string; text: string }> = [];
      for (const filePath of filePaths) {
        const rawData = fs.readFileSync(filePath, "utf-8");
        const textChunks = this.splitText(rawData);
        const sourceName = path.basename(filePath);
        sourceChunks.push(...textChunks.map((text) => ({ source: sourceName, text })));
      }
      await this.embedderChunks(sourceChunks);
    } catch (error) {
      console.error("Error loading source directory", error);
      this.chunks = [];
    }
  }
  private splitText(text: string): string[] {
    let i = 0;
    const textChunks: string[] = [];
    while (i < text.length) {
      const chunk = text.slice(i, i + this.chunkSize);
      textChunks.push(chunk);
      i += this.chunkSize - this.overlap;
    }
    return textChunks;
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  private renderProgress(completed: number, total: number): string {
    const width = 20;
    const ratio = total === 0 ? 0 : completed / total;
    const filled = Math.round(ratio * width);
    const bar = `${"=".repeat(filled)}${"-".repeat(width - filled)}`;
    const percent = (ratio * 100).toFixed(1);
    return `[${bar}] ${percent}% (${completed}/${total})`;
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const runWorker = async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        results[current] = await worker(items[current], current);
      }
    };

    const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
    await Promise.all(workers);
    return results;
  }

  async embedderChunks(sourceChunks: Array<{ source: string; text: string }>): Promise<Chunk[]> {
    if (sourceChunks.length === 0) {
      this.chunks = [];
      return this.chunks;
    }

    const embedding = new Embedding();
    const textBatches = this.chunkArray(sourceChunks, this.batchSize);
    const totalBatches = textBatches.length;
    let completedBatches = 0;
    console.log(`loading embeddings: ${this.renderProgress(0, totalBatches)}`);
    const embeddedBatches = await this.runWithConcurrency(
      textBatches,
      this.concurrency,
      async (batch, batchIndex) => {
        const texts = batch.map((item) => item.text);
        const res = await embedding.embedBatch(texts);
        completedBatches += 1;
        console.log(
          `embedding progress ${this.renderProgress(completedBatches, totalBatches)} batch=${batchIndex + 1}`,
        );
        return res;
      },
    );

    const flatEmbeddings = embeddedBatches.flat();
    const chunks = sourceChunks.map((item, index) => ({
      id: `${item.source}-chunk-${index}`,
      text: item.text,
      embedding: flatEmbeddings[index] ?? [],
      source: item.source,
    }));

    this.chunks = chunks;
    return chunks;
  }
}
