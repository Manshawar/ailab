import express from "express";
import { santiRouter } from "./routes/santi/index.js";
import { FileWatcher } from "./helper/fileWatcher.js";
import path from "path";

const watchPath = path.join(process.cwd(), "docs");
new FileWatcher(watchPath);

const app = express();
app.use(express.json());

app.use("/santi", santiRouter);

app.listen(3000, () => {
  console.log("RAG API running on port 3000");
  console.log("  basic: /basic/ask, /basic/embed, /basic/similarity");
  console.log("  santi: /santi/");
});
