// Local storage helpers for standalone Black Belt Platform
// Files are stored in /uploads directory

import { promises as fs } from "fs";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Ensure uploads directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create upload directory:", error);
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  await ensureUploadDir();
  
  const key = normalizeKey(relKey);
  const filePath = join(UPLOAD_DIR, key);
  
  // Ensure directory exists
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  await fs.mkdir(dir, { recursive: true });
  
  // Write file
  if (typeof data === "string") {
    await fs.writeFile(filePath, data, "utf-8");
  } else {
    await fs.writeFile(filePath, data);
  }
  
  // Return local URL
  const url = `/uploads/${key}`;
  return { key, url };
}

export async function storageGet(
  relKey: string,
  _expiresIn = 300
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const url = `/uploads/${key}`;
  
  return {
    key,
    url,
  };
}
