import express from "express";
import { smartRAG } from "./ragService.js";

const app = express();
app.use(express.json());
app.post("/ask", async (req, res) => {
  const { question } = req.body;
  try {
    const result = await smartRAG(question);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "Couldn't process your question",
    });
  }
});
app.listen(3000, () => {
  console.log("RAG API running on port 3000");
});
