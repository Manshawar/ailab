import crypto from "crypto";
export function hash(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}
