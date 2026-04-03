import fs from "fs/promises";
import { normalize } from "./text";
export async function readFile(path: string) {
  try {
    return normalize(await fs.readFile(path, "utf-8"));
  } catch (error) {
    console.error(error);
    return null;
  }
}
