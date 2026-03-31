import { OpenAI } from "openai";
import fs from "fs/promises";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

const openai = new OpenAI({
  baseURL: process.env.MAAS_BASE_URL_OPENAI,
  apiKey: process.env.MAAS_API_KEY,
});
const extractJsonSchema = (text: string) => {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const jsonStr = match ? match[1].trim() : text.trim();

  return JSON.parse(jsonStr);
};
async function selectRelevantFile(question: string) {
  const files = await fs.readdir("./docs");
  const fileList = files
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
    .map((f) => ({ filename: f }));
  console.log(fileList);
  const response = await openai.chat.completions.create({
    model: process.env.MAAS_MODEL_ID as string,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant that selects the most relevant file from the list.",
      },
      {
        role: "user",
        content: ` Available files: ${JSON.stringify(fileList)}
        Question: ${question}
        Select the most relevant file and explain why. Respond in JSON format.
        Example response:
        {
          "filename": "documentation.md",
          "reason": "The question is about the documentation, so the most relevant file is the documentation."
        }
        `,
      },
    ],
  });
  console.log(extractJsonSchema(response.choices[0].message.content as string));
  return extractJsonSchema(response.choices[0].message.content as string);
}

export async function smartRAG(question: string) {
  try {
    const fileSelection = await selectRelevantFile(question);
    console.log(`Selected ${fileSelection.filename} because: ${fileSelection.reason}`);
    const docContent = await fs.readFile(`./docs/${fileSelection.filename}`, "utf-8");
    const response = await openai.chat.completions.create({
      model: process.env.MAAS_MODEL_ID as string,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that answers questions based on the provided documentation.`,
        },
        {
          role: "user",
          content: `Documentation: ${docContent}
        Question: ${question}
        Please answer the question using information from the documentation. If the answer isn't in the documentation, say so politely.`,
        },
      ],
    });
    return {
      answer: response.choices[0].message.content,
      fileSelection,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
