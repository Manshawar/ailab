import express from "express";
import { basicRouter } from "./routes/basic/index.js";
import { santiRouter } from "./routes/santi/index.js";

const app = express();
app.use(express.json());

app.use("/basic", basicRouter);
app.use("/santi", santiRouter);

app.listen(3000, () => {
  console.log("RAG API running on port 3000");
  console.log("  basic: /basic/ask, /basic/embed, /basic/similarity");
  console.log("  santi: /santi/");
});
