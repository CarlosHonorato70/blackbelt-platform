// Dual-mode storage: S3 (production) or local filesystem (development)

import { promises as fs } from "fs";
import { log } from "./_core/logger";
import { join } from "path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_DIR = join(process.cwd(), "uploads");

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION || "us-east-1";

const s3 = S3_BUCKET
  ? new S3Client({
      region: S3_REGION,
      ...(process.env.AWS_ACCESS_KEY_ID && {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      }),
    })
  : null;

// Local storage helpers
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    log.error("Failed to create upload directory", { error: error instanceof Error ? error.message : String(error) });
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
  const key = normalizeKey(relKey);

  if (s3 && S3_BUCKET) {
    const body = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    const url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    return { key, url };
  }

  // Local filesystem fallback
  await ensureUploadDir();
  const filePath = join(UPLOAD_DIR, key);
  const dir = filePath.substring(0, filePath.lastIndexOf("/") > -1 ? filePath.lastIndexOf("/") : filePath.lastIndexOf("\\"));
  await fs.mkdir(dir, { recursive: true });

  if (typeof data === "string") {
    await fs.writeFile(filePath, data, "utf-8");
  } else {
    await fs.writeFile(filePath, data);
  }

  const url = `/uploads/${key}`;
  return { key, url };
}

export async function storageGet(
  relKey: string,
  expiresIn = 300
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);

  if (s3 && S3_BUCKET) {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
      { expiresIn }
    );
    return { key, url };
  }

  // Local filesystem fallback
  const url = `/uploads/${key}`;
  return { key, url };
}
