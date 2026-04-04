/**
 * Express routes for certification file uploads.
 * tRPC doesn't support multipart/form-data, so we use Express + multer.
 *
 * When a .p12 (A1 certificate) is uploaded with a password, the platform:
 * 1. Validates the certificate can be opened
 * 2. Extracts CN and expiry date
 * 3. Encrypts the password for secure storage
 * 4. Marks it as the tenant's signing certificate
 */

import type { Express, Request, Response } from "express";
import multer, { memoryStorage } from "multer";
import crypto from "crypto";
import * as forge from "node-forge";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./_core/cookies";
import { getUserById, getDb } from "./db";
import { log } from "./_core/logger";
import { consultantCertifications } from "../drizzle/schema";
import { storagePut } from "./storage";
import { checkSubscriptionLimits } from "./_core/subscriptionMiddleware";

// Encryption for certificate passwords (AES-256-GCM)
const CERT_ENC_KEY = process.env.CERT_ENCRYPTION_KEY || process.env.COOKIE_SECRET || "blackbelt-default-enc-key-change-me";
function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptPassword(password: string): string {
  const key = deriveKey(CERT_ENC_KEY);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptPassword(encrypted: string): string {
  const [ivHex, tagHex, dataHex] = encrypted.split(":");
  const key = deriveKey(CERT_ENC_KEY);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(dataHex, "hex", "utf8") + decipher.final("utf8");
}

function validateP12(buffer: Buffer, password: string): { subject: string; validTo: Date } | { error: string } {
  try {
    const p12Asn1 = forge.asn1.fromDer(buffer.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0 || !certBag[0].cert) {
      return { error: "Certificado não encontrado no arquivo .p12" };
    }

    const cert = certBag[0].cert;
    const cn = cert.subject.getField("CN")?.value || "Desconhecido";
    const validTo = cert.validity.notAfter;

    if (new Date() > validTo) {
      return { error: `Certificado expirado em ${validTo.toLocaleDateString("pt-BR")}` };
    }

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || !keyBag[0] || !keyBag[0].key) {
      return { error: "Chave privada não encontrada no arquivo .p12" };
    }

    return { subject: cn, validTo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Invalid password") || msg.includes("PKCS#12")) {
      return { error: "Senha incorreta para o certificado .p12" };
    }
    return { error: `Erro ao validar certificado: ${msg}` };
  }
}

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
      "application/x-pkcs12",
      "application/x-pem-file",
    ];
    const isValidExt =
      ext.endsWith(".pdf") ||
      ext.endsWith(".jpg") ||
      ext.endsWith(".jpeg") ||
      ext.endsWith(".png") ||
      ext.endsWith(".webp") ||
      ext.endsWith(".p12") ||
      ext.endsWith(".pfx");
    if (allowed.includes(file.mimetype) || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error("Formatos aceitos: PDF, JPG, PNG, WEBP, P12, PFX"));
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

        // Verificar limite de storage do plano
        const storageCheck = await checkSubscriptionLimits(auth.tenantId, "storage");
        if (!storageCheck.withinLimit) {
          return res.status(403).json({ error: "Limite de armazenamento do plano atingido. Faça upgrade para continuar." });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "Arquivo não enviado" });
        }

        const { name, certType, registryNumber, issuer, issuedAt, expiresAt, notes, certPassword: rawPassword } = req.body;
        if (!name || !certType) {
          return res.status(400).json({ error: "Nome e tipo da certificação são obrigatórios" });
        }

        const id = nanoid();
        const ext = file.originalname.split(".").pop()?.toLowerCase() || "pdf";
        const isP12 = ext === "p12" || ext === "pfx";

        // Validate .p12 certificate if applicable
        let certSubject: string | null = null;
        let certValidTo: Date | null = null;
        let encryptedPassword: string | null = null;

        if (isP12) {
          if (!rawPassword) {
            return res.status(400).json({ error: "Senha obrigatória para certificados .p12" });
          }

          const validation = validateP12(file.buffer, rawPassword);
          if ("error" in validation) {
            return res.status(400).json({ error: validation.error });
          }

          certSubject = validation.subject;
          certValidTo = validation.validTo;
          encryptedPassword = encryptPassword(rawPassword);

          log.info("[Certifications] A1 certificate validated", {
            tenantId: auth.tenantId,
            subject: certSubject,
            validTo: certValidTo.toISOString(),
          });
        }

        const fileKey = `certifications/${auth.tenantId}/${id}.${ext}`;
        const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

        const db = await getDb();

        // If this is a signing cert, deactivate any existing signing certs for this tenant
        if (isP12) {
          await db
            .update(consultantCertifications)
            .set({ isSigningCert: false, updatedAt: new Date() })
            .where(
              and(
                eq(consultantCertifications.tenantId, auth.tenantId),
                eq(consultantCertifications.isSigningCert, true)
              )
            );
        }

        await db.insert(consultantCertifications).values({
          id,
          tenantId: auth.tenantId,
          uploadedBy: auth.userId,
          name,
          registryNumber: registryNumber || null,
          certType,
          issuer: issuer || null,
          issuedAt: issuedAt ? new Date(issuedAt) : null,
          expiresAt: certValidTo || (expiresAt ? new Date(expiresAt) : null),
          fileKey,
          fileUrl: url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: isP12 ? "application/x-pkcs12" : file.mimetype,
          status: "active",
          isSigningCert: isP12,
          certPassword: encryptedPassword,
          certSubject,
          certValidTo,
          notes: notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Invalidate signing cache so next PDF uses the new cert
        if (isP12) {
          const { invalidateTenantCertCache } = await import("./_core/pdfSigner");
          invalidateTenantCertCache(auth.tenantId);
        }

        log.info("[Certifications] Upload successful", {
          id,
          tenantId: auth.tenantId,
          certType,
          isSigningCert: isP12,
        });

        res.json({
          id,
          fileUrl: url,
          fileName: file.originalname,
          isSigningCert: isP12,
          certSubject,
          certValidTo: certValidTo?.toISOString() || null,
        });
      } catch (error) {
        log.error("[Certifications] Upload error", {
          error: error instanceof Error ? error.message : String(error),
        });
        res.status(500).json({ error: "Erro ao fazer upload da certificação" });
      }
    }
  );
}
