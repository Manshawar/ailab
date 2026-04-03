import chokidar from "chokidar";
import { readFile } from "../utils/file";
import { hash } from "../utils/hash";
import { AsyncTaskQueue } from "../utils/taskQueue";
export class FileWatcher {
  private watcher?: ReturnType<typeof chokidar.watch>;
  private files: Set<string>;
  private isReady = false;
  private metaMap: Map<string, unknown> = new Map();
  private readonly loadQueue = new AsyncTaskQueue();
  constructor(private watchPath: string) {
    this.files = new Set<string>();
    this.init();
  }
  private async init() {
    this.fileWatch();
  }
  private async fileWatch() {
    this.watcher = chokidar.watch(this.watchPath, {
      persistent: true,
      ignoreInitial: false, // 启动时是否触发 add 事件
      awaitWriteFinish: {
        stabilityThreshold: 300, // 等待写入完成
        pollInterval: 100,
      },
    });
    // 事件监听
    this.watcher
      .on("add", (path) => {
        console.log(`➕ 文件添加: ${path}`);
        this.files.add(path);
        this.readyLoader(path);
      })
      .on("change", (path) => {
        console.log(`✏️  文件修改: ${path}`);
        this.readyLoader(path);
      })
      .on("unlink", (path) => {
        console.log(`🗑️  文件删除: ${path}`);
        this.readyLoader(path);
      })
      .on("error", (error) => console.error(`❌ 错误: ${error}`))
      .on("ready", async () => {
        console.log(this.files);
        await Promise.all(
          [...this.files].map((file) =>
            this.loadQueue.enqueue(() => this.loader(file as string)),
          ),
        );
        this.isReady = true;
        console.log("✅ 初始扫描完成，开始监听");
      });
  }
  private async loader(file: string) {
    const fileContent = await readFile(file as string);
    const hash = await this.hashConstruct(fileContent as string);
    
    this.metaMap.set(file, {
      hash: hash,
      content: fileContent,
    });
    // console.log(this.metaMap);
  }
  private async hashConstruct(text: string) {
    return hash(text);
  }
  private readyLoader(path: string) {
    if (!this.isReady) {
      return;
    }
    void this.loadQueue.enqueue(() => this.loader(path)).catch((err) => {
      console.error(`❌ 加载失败: ${path}`, err);
    });
  }
}
