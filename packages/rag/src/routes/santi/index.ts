import express, { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import { VectorStore } from "./vectorStore";

/** 《三体》专用 RAG：在此目录下扩展 handler，避免与 basic 混写 */
export const santiRouter: express.IRouter = Router();

async function initSystem() {
  const sourceDir =
    process.env.SANTI_LIBRARY_DIR ?? path.join(process.cwd(), "docs", "santi-library");
  fs.mkdirSync(sourceDir, { recursive: true });
  new VectorStore(sourceDir);
}
initSystem().catch(console.error);