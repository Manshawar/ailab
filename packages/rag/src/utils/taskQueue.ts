/**
 * 限制同时执行的异步任务数量（FIFO），适合对上游 API 或 I/O 做并发上限控制。
 * 传入 `1` 时等价于串行队列。
 */
export class AsyncConcurrencyQueue {
  private active = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly maxConcurrency: number) {}

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this.active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.drain();
          });
      };
      if (this.active < this.maxConcurrency) {
        run();
      } else {
        this.waitQueue.push(run);
      }
    });
  }

  private drain(): void {
    if (this.waitQueue.length === 0 || this.active >= this.maxConcurrency) {
      return;
    }
    const next = this.waitQueue.shift()!;
    next();
  }
}
