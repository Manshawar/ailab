export function normalize(text: string) {
  return text
    .replace(/\r\n/g, "\n") // 统一换行
    .replace(/\s+/g, " ") // 压缩空格
    .trim();
}
