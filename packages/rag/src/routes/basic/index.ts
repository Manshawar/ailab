import express, { Router } from "express";
import { smartRAG } from "./ragService.js";
import { Embedder, similarity } from "./embedding/basic.js";

/** 通用 RAG / 嵌入 / 相似度，与三体等业务隔离 */
export const basicRouter: express.IRouter = Router();

basicRouter.post("/ask", async (req, res) => {
  const { question } = req.body;
  try {
    const result = await smartRAG(question);
    res.json(result);
  } catch {
    res.status(500).json({
      error: "Couldn't process your question",
    });
  }
});

basicRouter.post("/embed", async (req, res) => {
  const { text } = req.body;
  const embedder = new Embedder();
  const embedding = await embedder.embed(text);
  res.json(embedding);
});

basicRouter.post("/similarity", async (req, res) => {
  const { texts } = req.body;
  const embedder = new Embedder();
  const embeddings = await embedder.embedBatch(texts);
  const result = similarity(embeddings[0], embeddings[1]);
  res.json(result);
});
