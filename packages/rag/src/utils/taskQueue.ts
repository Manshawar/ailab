/**
 * 将异步任务按 FIFO 串行执行：前一个完成后再执行下一个。
 */
export class AsyncTaskQueue {
  private chain: Promise<void> = Promise.resolve();

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.chain = this.chain.then(async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        }
      });
    });
  }
}
