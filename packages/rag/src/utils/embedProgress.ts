import path from "path";

function shortLabel(filePath: string, maxLen = 40): string {
  const base = path.basename(filePath);
  if (base.length <= maxLen) {
    return base;
  }
  return `${base.slice(0, maxLen - 1)}…`;
}

/**
 * 在终端单行刷新嵌入进度（\r 覆盖同一行，结束时换行）。
 */
export function createEmbedProgress(label: string, total: number) {
  const name = shortLabel(label);

  if (total === 0) {
    process.stdout.write(`\r【embed】${name} 无分块\n`);
    return { increment: (): void => {} };
  }

  let done = 0;
  const barW = 28;

  const render = (): void => {
    const pct = Math.min(100, Math.round((done / total) * 100));
    const filled = Math.round((done / total) * barW);
    const bar = "█".repeat(filled) + "░".repeat(barW - filled);
    const line = `\r【embed】${name} │${bar}│ ${done}/${total} ${pct}%`;
    const cols = process.stdout.columns ?? 96;
    process.stdout.write(line.padEnd(Math.min(cols, 120), " "));
  };

  render();

  return {
    increment: (): void => {
      done++;
      render();
      if (done >= total) {
        process.stdout.write("\n");
      }
    },
  };
}
