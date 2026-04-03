/**
 * PDF Digital Signature using A1 Certificate (ICP-Brasil)
 *
 * Supports:
 * - Global certificate (from .env / filesystem) as fallback
 * - Per-tenant certificates (from DB + storage) with priority
 *
 * Uses the PDF signature standard (adbe.pkcs7.detached) compatible with
 * Adobe Reader, Foxit, and ICP-Brasil validators.
 */

import * as forge from "node-forge";
import { readFileSync } from "fs";
import { join } from "path";
import { eq, and } from "drizzle-orm";
import { log } from "./logger";

type CertData = {
  key: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  chain: forge.pki.Certificate[];
};

// ── Global certificate cache ──────────────────────────────────────────

let globalCert: CertData | null | undefined; // undefined = not tried yet

function loadGlobalCertificate(): CertData | null {
  if (globalCert !== undefined) return globalCert;

  const certPath = process.env.A1_CERT_PATH || join(process.cwd(), "server/certs/blackbelt-a1.p12");
  const certPassword = process.env.A1_CERT_PASSWORD || "";

  try {
    const buf = readFileSync(certPath);
    globalCert = parsePkcs12(buf, certPassword);
    if (globalCert) {
      log.info("[PDFSigner] Global certificate loaded", {
        subject: globalCert.cert.subject.getField("CN")?.value,
      });
    }
    return globalCert;
  } catch {
    globalCert = null;
    return null;
  }
}

// ── Per-tenant certificate cache (TTL 5 min) ──────────────────────────

const tenantCertCache = new Map<string, { data: CertData | null; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function loadTenantCertificate(tenantId: string): Promise<CertData | null> {
  const cached = tenantCertCache.get(tenantId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  try {
    const { getDb } = await import("../db");
    const { consultantCertifications } = await import("../../drizzle/schema");
    const { storageGet } = await import("../storage");

    const db = await getDb();
    const [signingCert] = await db
      .select()
      .from(consultantCertifications)
      .where(
        and(
          eq(consultantCertifications.tenantId, tenantId),
          eq(consultantCertifications.isSigningCert, true),
          eq(consultantCertifications.status, "active")
        )
      )
      .limit(1);

    if (!signingCert || !signingCert.certPassword) {
      tenantCertCache.set(tenantId, { data: null, ts: Date.now() });
      return null;
    }

    // Decrypt password
    const { decryptPassword } = await import("../certificationUploadRoutes");
    const password = decryptPassword(signingCert.certPassword);

    // Get file from storage
    const { url } = await storageGet(signingCert.fileKey);

    // For local storage, read file directly
    let fileBuffer: Buffer;
    if (url.startsWith("/uploads/")) {
      fileBuffer = readFileSync(join(process.cwd(), url));
    } else {
      // S3: fetch the file
      const response = await fetch(url);
      fileBuffer = Buffer.from(await response.arrayBuffer());
    }

    const certData = parsePkcs12(fileBuffer, password);

    if (certData) {
      // Check if expired
      if (new Date() > certData.cert.validity.notAfter) {
        log.warn("[PDFSigner] Tenant certificate expired", { tenantId });
        tenantCertCache.set(tenantId, { data: null, ts: Date.now() });
        return null;
      }

      log.info("[PDFSigner] Tenant certificate loaded", {
        tenantId,
        subject: certData.cert.subject.getField("CN")?.value,
      });
    }

    tenantCertCache.set(tenantId, { data: certData, ts: Date.now() });
    return certData;
  } catch (err) {
    log.error("[PDFSigner] Failed to load tenant certificate", {
      tenantId,
      error: err instanceof Error ? err.message : String(err),
    });
    tenantCertCache.set(tenantId, { data: null, ts: Date.now() });
    return null;
  }
}

// ── PKCS#12 parser ────────────────────────────────────────────────────

function parsePkcs12(buffer: Buffer, password: string): CertData | null {
  try {
    const p12Asn1 = forge.asn1.fromDer(buffer.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || !keyBag[0] || !keyBag[0].key) return null;

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0 || !certBag[0].cert) return null;

    return {
      key: keyBag[0].key as forge.pki.rsa.PrivateKey,
      cert: certBag[0].cert,
      chain: certBag.slice(1).filter((b: forge.pkcs12.Bag) => b.cert).map((b: forge.pkcs12.Bag) => b.cert!),
    };
  } catch (err) {
    log.error("[PDFSigner] PKCS#12 parse error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ── PKCS#7 signature creation ─────────────────────────────────────────

function createPkcs7Signature(data: Buffer, certData: CertData): Buffer | null {
  try {
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(data.toString("binary"));

    p7.addCertificate(certData.cert);
    for (const c of certData.chain) {
      p7.addCertificate(c);
    }

    p7.addSigner({
      key: certData.key,
      certificate: certData.cert,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
        { type: forge.pki.oids.messageDigest },
        { type: forge.pki.oids.signingTime, value: new Date().toISOString() },
      ],
    });

    p7.sign({ detached: true });

    const asn1 = p7.toAsn1();
    const derBytes = forge.asn1.toDer(asn1).getBytes();
    return Buffer.from(derBytes, "binary");
  } catch (err) {
    log.error("[PDFSigner] PKCS#7 signature error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ── PDF signing ───────────────────────────────────────────────────────

const SIGNATURE_MAX_LENGTH = 8192;

function signPdfWithCert(pdfBuffer: Buffer, certData: CertData): Buffer {
  try {
    const pdf = pdfBuffer.toString("binary");

    const xrefMatch = pdf.match(/startxref\s+(\d+)\s+%%EOF/);
    if (!xrefMatch) {
      log.warn("[PDFSigner] Could not find xref in PDF");
      return pdfBuffer;
    }

    const certSubject = certData.cert.subject.getField("CN")?.value || "Certificado Digital";
    const now = new Date();

    const byteRangePlaceholder = "/ByteRange [0 0000000000 0000000000 0000000000]";
    const signaturePlaceholder = "0".repeat(SIGNATURE_MAX_LENGTH * 2);

    const sigDictObj = [
      `\n`,
      `% Digital Signature - ICP-Brasil A1\n`,
      `${pdf.length} 0 obj\n`,
      `<< /Type /Sig\n`,
      `   /Filter /Adobe.PPKLite\n`,
      `   /SubFilter /adbe.pkcs7.detached\n`,
      `   /Name (${certSubject})\n`,
      `   /M (D:${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}-03'00')\n`,
      `   /Reason (Documento assinado digitalmente com certificado ICP-Brasil A1)\n`,
      `   /Location (Brasil)\n`,
      `   ${byteRangePlaceholder}\n`,
      `   /Contents <${signaturePlaceholder}>\n`,
      `>>\n`,
      `endobj\n`,
    ].join("");

    let signedPdf = pdf + sigDictObj;

    const contentsStart = signedPdf.lastIndexOf(`/Contents <`) + `/Contents <`.length;
    const contentsEnd = contentsStart + signaturePlaceholder.length;

    const byteRange = [0, contentsStart, contentsEnd + 1, signedPdf.length - (contentsEnd + 1)];
    const byteRangeStr = `/ByteRange [0 ${String(byteRange[1]).padStart(10, "0")} ${String(byteRange[2]).padStart(10, "0")} ${String(byteRange[3]).padStart(10, "0")}]`;

    signedPdf = signedPdf.replace(byteRangePlaceholder, byteRangeStr);

    const part1 = Buffer.from(signedPdf.substring(0, byteRange[1]), "binary");
    const part2 = Buffer.from(signedPdf.substring(byteRange[2]), "binary");
    const dataToSign = Buffer.concat([part1, part2]);

    const signature = createPkcs7Signature(dataToSign, certData);
    if (!signature) return pdfBuffer;

    const sigHex = signature.toString("hex");
    if (sigHex.length > SIGNATURE_MAX_LENGTH * 2) {
      log.error("[PDFSigner] Signature too large", { size: sigHex.length });
      return pdfBuffer;
    }

    const paddedSigHex = sigHex + "0".repeat(SIGNATURE_MAX_LENGTH * 2 - sigHex.length);
    signedPdf = signedPdf.substring(0, contentsStart) + paddedSigHex + signedPdf.substring(contentsEnd);

    log.info("[PDFSigner] PDF signed", { signer: certSubject });
    return Buffer.from(signedPdf, "binary");
  } catch (err) {
    log.error("[PDFSigner] Signing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return pdfBuffer;
  }
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Sign a PDF with the tenant's A1 certificate.
 * Falls back to the global certificate if tenant has none.
 * Returns unsigned PDF if no certificate is available.
 */
export async function signPdfForTenant(pdfBuffer: Buffer, tenantId?: string): Promise<Buffer> {
  // 1. Try tenant-specific certificate
  if (tenantId) {
    const tenantCert = await loadTenantCertificate(tenantId);
    if (tenantCert) {
      return signPdfWithCert(pdfBuffer, tenantCert);
    }
  }

  // 2. Fall back to global certificate
  const global = loadGlobalCertificate();
  if (global) {
    return signPdfWithCert(pdfBuffer, global);
  }

  return pdfBuffer;
}

/**
 * Synchronous version for backward compat — uses global cert only.
 */
export function signPdf(pdfBuffer: Buffer): Buffer {
  const global = loadGlobalCertificate();
  if (!global) return pdfBuffer;
  return signPdfWithCert(pdfBuffer, global);
}

/**
 * Check if digital signing is available (at least global cert).
 */
export function isSigningAvailable(): boolean {
  return loadGlobalCertificate() !== null;
}

/**
 * Invalidate tenant cert cache (call after upload/delete).
 */
export function invalidateTenantCertCache(tenantId: string) {
  tenantCertCache.delete(tenantId);
}

/**
 * Get certificate info for display purposes.
 */
export function getCertificateInfo() {
  const certs = loadGlobalCertificate();
  if (!certs) return null;

  return {
    subject: certs.cert.subject.getField("CN")?.value,
    issuer: certs.cert.issuer.getField("CN")?.value,
    serialNumber: certs.cert.serialNumber,
    validFrom: certs.cert.validity.notBefore,
    validTo: certs.cert.validity.notAfter,
    isExpired: new Date() > certs.cert.validity.notAfter,
  };
}
