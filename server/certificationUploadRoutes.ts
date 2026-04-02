/**
 * Express routes for certification file uploads.
 * tRPC doesn't support multipart/form-data, so we use Express + multer.
 */

import type { Express, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./_core/cookies";
import { getUserById, getDb } from "./db";
import { log } from "./_core/logger";
import { consultantCertifications } from "../drizzle/schema";
import { storagePut } from "./storage";

const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname?.toLowerCase() || "";
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    const isValidExt =
      ext.endsWith(".pdf") ||
      ext.endsWith(".jpg") ||
      ext.endsWith(".jpeg") ||
      ext.endsWith(".png") ||
      ext.endsWith(".webp");
    if (allowed.includes(file.mimetype) || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Formatos aceitos: PDF, JPG, PNG, WEBP"));
    }
  },
});

async function authenticateRequest(
  req: Request,
  res: Response
): Promise<{ userId: string; tenantId: string } | null> {
  const sessionToken = req.cookies?.[COOKIE_NAME];
  if (!sessionToken) {
    res.status(401).json({ error: "Autenticação necessária" });
    return null;
  }

  const result = verifySessionToken(sessionToken);
  if (!result) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
    return null;
  }

  const user = await getUserById(result.userId);
  if (!user || !user.tenantId) {
    res.status(403).json({ error: "Usuário não encontrado" });
    return null;
  }

  return { userId: user.id, tenantId: user.tenantId };
}

export function registerCertificationUploadRoutes(app: Express) {
  app.post(
    "/api/certifications/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const auth = await authenticateRequest(req, res);
        if (!auth) return;

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "Arquivo não enviado" });
        }

        const { name, certType, registryNumber, issuer, issuedAt, expiresAt, notes } = req.body;
        if (!name || !certType) {
          return res.status(400).json({ error: "Nome e tipo da certificação são obrigatórios" });
        }

        const id = nanoid();
        const ext = file.originalname.split(".").pop()?.toLowerCase() || "pdf";
        const fileKey = `certifications/${auth.tenantId}/${id}.${ext}`;

        const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

        const db = await getDb();
        await db.insert(consultantCertifications).values({
          id,
          tenantId: auth.tenantId,
          uploadedBy: auth.userId,
          name,
          registryNumber: registryNumber || null,
          certType,
          issuer: issuer || null,
          issuedAt: issuedAt ? new Date(issuedAt) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          fileKey,
          fileUrl: url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          status: "active",
          notes: notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        log.info("[Certifications] Upload successful", { id, tenantId: auth.tenantId, certType });
        res.json({ id, fileUrl: url, fileName: file.originalname });
      } catch (error) {
        log.error("[Certifications] Upload error", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Erro ao fazer upload da certificação" });
      }
    }
  );
}
