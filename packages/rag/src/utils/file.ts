import fs from "fs/promises";
export async function readFile(path: string) {
  try {
    return await fs.readFile(path, "utf-8");
  } catch (error) {
    console.error(error);
    return null;
  }
}
