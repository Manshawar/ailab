import express, { Router } from "express";
import { multiQuery } from "../../service/multi-query.js";
/** 《三体》专用 RAG：在此目录下扩展 handler，避免与 basic 混写 */
export const santiRouter: express.IRouter = Router();

/** POST JSON `{ "question": "..." }` 或 GET `?question=...` */
async function handleAsk(req: express.Request, res: express.Response) {
  const question =
    typeof req.body?.question === "string"
      ? req.body.question
      : typeof req.query.question === "string"
        ? req.query.question
        : "";
  const results = await multiQuery(question);
  if (!results.ready) {
    res.status(503).json(results);
    return;
  }
  res.json(results);
}

santiRouter.post("/ask", handleAsk);
santiRouter.get("/ask", handleAsk);
