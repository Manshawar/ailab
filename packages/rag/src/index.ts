import express from "express";
import { santiRouter } from "./routes/santi/index.js";
import path from "path";
import { initRagCorpus } from "./ragInstance.js";

const watchPath = path.join(process.cwd(), "docs");
/** 不阻塞：监听立即开始，语料索引在后台由 RagCorpus 异步完成 */
initRagCorpus(watchPath);

const app = express();
app.use(express.json());

app.use("/santi", santiRouter);

app.listen(3000, () => {
  console.log("RAG API running on port 3000");
  console.log("  basic: /basic/ask, /basic/embed, /basic/similarity");
  console.log("  santi: /santi/");
});
