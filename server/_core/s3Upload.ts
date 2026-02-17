/**
 * S3 Upload Utility for PDF Storage
 * Handles file uploads to AWS S3 with presigned URLs
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

// S3 Configuration
const S3_REGION = process.env.AWS_REGION || "us-east-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET || "blackbelt-pdfs";
const S3_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.AWS_S3_ENDPOINT; // Optional for custom S3-compatible storage

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
      throw new Error("AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
    }

    s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
      ...(S3_ENDPOINT && { endpoint: S3_ENDPOINT }),
    });
  }

  return s3Client;
}

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET);
}

/**
 * Upload a PDF buffer to S3
 */
export async function uploadPdfToS3(
  buffer: Buffer,
  filename: string,
  tenantId: string,
  metadata?: Record<string, string>
): Promise<{ key: string; bucket: string; url: string }> {
  if (!isS3Configured()) {
    throw new Error("S3 not configured. Cannot upload PDF.");
  }

  const client = getS3Client();
  const timestamp = new Date().toISOString().split("T")[0];
  const uniqueId = nanoid(10);
  const key = `tenants/${tenantId}/pdfs/${timestamp}/${uniqueId}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
    Metadata: metadata || {},
  });

  await client.send(command);

  // Generate presigned URL valid for 24 hours
  const url = await getPresignedDownloadUrl(key, 86400);

  return {
    key,
    bucket: S3_BUCKET,
    url,
  };
}

/**
 * Generate a presigned URL for downloading a PDF
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<string> {
  if (!isS3Configured()) {
    throw new Error("S3 not configured. Cannot generate download URL.");
  }

  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(client, command, { expiresIn });
  return url;
}

/**
 * Delete a PDF from S3
 */
export async function deletePdfFromS3(key: string): Promise<void> {
  if (!isS3Configured()) {
    throw new Error("S3 not configured. Cannot delete PDF.");
  }

  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await client.send(command);
}

/**
 * Get S3 configuration
 */
export function getS3Config() {
  return {
    region: S3_REGION,
    bucket: S3_BUCKET,
    configured: isS3Configured(),
  };
}
