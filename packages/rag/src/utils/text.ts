import { hash } from "./hash";

export const CHUNK_DEFAULT_SIZE = 500;
export const CHUNK_DEFAULT_OVERLAP = 100;

export function normalize(text: string) {
  return text
    .replace(/\r\n/g, "\n") // 统一换行
    .replace(/\s+/g, " ") // 压缩空格
    .trim();
}
export function chunkText(
  text: string,
  size = CHUNK_DEFAULT_SIZE,
  overlap = CHUNK_DEFAULT_OVERLAP
) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + size;
    const content = text.slice(start, end);

    const h = hash(content);

    chunks.push({
      id: h,
      text: content,
      hash: h,
    });

    start += size - overlap;
  }

  return chunks;
}
