好，这一版我给你**完整“可替换旧代码”的工程版本**，重点解决你刚才说的：

* ✅ JSONL 持久化
* ✅ 增量更新（diff）
* ✅ 删除（soft delete）
* ✅ 更新（覆盖 + hash）
* ✅ retrieval 自动过滤无效数据

👉 你可以**直接把旧代码替换掉重写这一版**

---

# 一、最终工程结构（升级版）

```bash
rag-system/
├── data/
│   ├── santibody.txt
│   └── index.jsonl   # 向量存储
├── core/
│   ├── chunk.ts
│   ├── hash.ts
│   ├── embed.ts
│   ├── cosine.ts
│   ├── storage.ts     # JSONL读写
│   ├── diff.ts        # 增量更新
│   ├── vector-store.ts
│   └── retriever.ts
├── pipeline/
│   ├── ingest.ts
│   └── query.ts
```

---

# 二、核心代码（完整）

---

# 1️⃣ chunk.ts

```ts
export type Chunk = {
  id: string
  text: string
}

export function chunkText(
  text: string,
  chunkSize = 500,
  overlap = 100
): Chunk[] {
  const chunks: Chunk[] = []

  let i = 0
  let index = 0

  while (i < text.length) {
    chunks.push({
      id: `chunk-${index++}`,
      text: text.slice(i, i + chunkSize)
    })

    i += chunkSize - overlap
  }

  return chunks
}
```

---

# 2️⃣ hash.ts

```ts
import crypto from "crypto"

export function hashText(text: string) {
  return crypto
    .createHash("md5")
    .update(text)
    .digest("hex")
}
```

---

# 3️⃣ embed.ts（你可以替换）

```ts
export async function embed(text: string): Promise<number[]> {
  const vec = new Array(256).fill(0)

  for (let i = 0; i < text.length; i++) {
    vec[i % 256] += text.charCodeAt(i) / 255
  }

  return vec
}
```

---

# 4️⃣ cosine.ts

```ts
export function computeNorm(vec: number[]) {
  let sum = 0
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i]
  }
  return Math.sqrt(sum)
}

export function cosineSimilarity(
  a: number[],
  b: number[],
  normA: number,
  normB: number
) {
  let dot = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
  }

  const denom = normA * normB
  return denom === 0 ? 0 : dot / denom
}
```

---

# 5️⃣ storage.ts（JSONL 核心🔥）

```ts
import fs from "fs"

export type ChunkRecord = {
  id: string
  text: string
  embedding: number[]
  hash: string
  isDeleted: boolean
}

// 读取
export function loadJSONL(file: string): Map<string, ChunkRecord> {
  const map = new Map()

  if (!fs.existsSync(file)) return map

  const lines = fs.readFileSync(file, "utf-8").split("\n")

  for (const line of lines) {
    if (!line.trim()) continue

    const obj = JSON.parse(line)
    map.set(obj.id, obj)
  }

  return map
}

// 全量写入（推荐方式）
export function writeJSONL(
  file: string,
  records: Iterable<ChunkRecord>
) {
  const lines = []

  for (const r of records) {
    lines.push(JSON.stringify(r))
  }

  fs.writeFileSync(file, lines.join("\n") + "\n")
}
```

---

# 6️⃣ diff.ts（核心🔥）

```ts
import { hashText } from "./hash"
import { Chunk } from "./chunk"
import { ChunkRecord } from "./storage"

export function diffChunks(
  newChunks: Chunk[],
  oldMap: Map<string, ChunkRecord>
) {
  const toAdd: Chunk[] = []
  const toUpdate: Chunk[] = []
  const toDelete: string[] = []

  const newIds = new Set()

  for (const chunk of newChunks) {
    newIds.add(chunk.id)

    const old = oldMap.get(chunk.id)
    const hash = hashText(chunk.text)

    if (!old) {
      toAdd.push(chunk)
    } else if (old.hash !== hash) {
      toUpdate.push(chunk)
    }
  }

  for (const [id, old] of oldMap) {
    if (!newIds.has(id) && !old.isDeleted) {
      toDelete.push(id)
    }
  }

  return { toAdd, toUpdate, toDelete }
}
```

---

# 7️⃣ vector-store.ts（支持过滤🔥）

```ts
import { computeNorm, cosineSimilarity } from "./cosine"
import { ChunkRecord } from "./storage"

type Stored = ChunkRecord & {
  norm: number
}

export class InMemoryVectorStore {
  private store: Stored[] = []

  async load(records: Iterable<ChunkRecord>) {
    for (const r of records) {
      if (r.isDeleted) continue

      this.store.push({
        ...r,
        norm: computeNorm(r.embedding)
      })
    }
  }

  async search(queryEmbedding: number[], topK: number) {
    const queryNorm = computeNorm(queryEmbedding)

    const results = []

    for (const item of this.store) {
      const score = cosineSimilarity(
        queryEmbedding,
        item.embedding,
        queryNorm,
        item.norm
      )

      results.push({
        id: item.id,
        text: item.text,
        score
      })
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
```

---

# 8️⃣ retriever.ts

```ts
import { embed } from "./embed"
import { InMemoryVectorStore } from "./vector-store"

export class Retriever {
  constructor(private store: InMemoryVectorStore) {}

  async search(query: string, topK = 5) {
    const queryEmbedding = await embed(query)
    return this.store.search(queryEmbedding, topK)
  }
}
```

---

# 三、Pipeline

---

# 9️⃣ ingest.ts（完整增量更新🔥）

```ts
import fs from "fs"
import { chunkText } from "../core/chunk"
import { embed } from "../core/embed"
import { hashText } from "../core/hash"
import { loadJSONL, writeJSONL } from "../core/storage"
import { diffChunks } from "../core/diff"

const INDEX_FILE = "./data/index.jsonl"

async function main() {
  const text = fs.readFileSync("./data/santibody.txt", "utf-8")

  const newChunks = chunkText(text)

  const oldMap = loadJSONL(INDEX_FILE)

  const { toAdd, toUpdate, toDelete } = diffChunks(
    newChunks,
    oldMap
  )

  console.log("新增:", toAdd.length)
  console.log("更新:", toUpdate.length)
  console.log("删除:", toDelete.length)

  // 处理新增 + 更新
  for (const chunk of [...toAdd, ...toUpdate]) {
    const embedding = await embed(chunk.text)

    oldMap.set(chunk.id, {
      id: chunk.id,
      text: chunk.text,
      embedding,
      hash: hashText(chunk.text),
      isDeleted: false
    })
  }

  // 处理删除
  for (const id of toDelete) {
    const old = oldMap.get(id)
    if (old) {
      old.isDeleted = true
      oldMap.set(id, old)
    }
  }

  // 写回
  writeJSONL(INDEX_FILE, oldMap.values())

  console.log("✅ 更新完成")
}

main()
```

---

# 🔟 query.ts

```ts
import { loadJSONL } from "../core/storage"
import { InMemoryVectorStore } from "../core/vector-store"
import { Retriever } from "../core/retriever"

async function main() {
  const map = loadJSONL("./data/index.jsonl")

  const store = new InMemoryVectorStore()
  await store.load(map.values())

  const retriever = new Retriever(store)

  const results = await retriever.search(
    "罗辑为什么成为面壁者",
    5
  )

  console.log("\n==== 结果 ====\n")

  for (const r of results) {
    console.log(r.score.toFixed(4))
    console.log(r.text.slice(0, 100))
    console.log("------")
  }
}

main()
```

---

# 四、你现在这套系统的能力

你已经实现：

```text
✅ JSONL 向量存储
✅ 增量更新（diff）
✅ 删除（soft delete）
✅ 更新（hash 对比）
✅ retrieval 自动过滤
```

---

# 五、我帮你做一个“最终判断”

你现在已经具备：

```text
👉 可用级 RAG 数据层 + 检索层（基础版）
```

---

# 六、接下来（我继续帮你定死）

👉 不要再动数据层了（已经够用）

---

# 🚀 下一步必须做：

```text
LLM Rerank（直接提升效果）
```

---

👉 你下一条直接说：

**「继续写 LLM rerank pipeline」**

我会给你：

* rerank prompt（工程级）
* 多 query + rerank
* 效果优化方法

直接把你这套系统提升到**能用级别**。
