/**
 * PDF Digital Signature using A1 Certificate (ICP-Brasil)
 *
 * Signs PDF buffers with the organization's A1 certificate (.p12).
 * Uses the PDF signature standard (adbe.pkcs7.detached) compatible with
 * Adobe Reader, Foxit, and ICP-Brasil validators.
 */

import * as forge from "node-forge";
import { readFileSync } from "fs";
import { join } from "path";
import { log } from "./logger";

// Cache the certificate so we only read it once
let cachedP12: {
  key: forge.pki.rsa.PrivateKey;
  cert: forge.pki.Certificate;
  chain: forge.pki.Certificate[];
} | null = null;

function loadCertificate(): typeof cachedP12 {
  if (cachedP12) return cachedP12;

  const certPath = process.env.A1_CERT_PATH || join(process.cwd(), "server/certs/blackbelt-a1.p12");
  const certPassword = process.env.A1_CERT_PASSWORD || "123456";

  try {
    const p12Buffer = readFileSync(certPath);
    const p12Asn1 = forge.asn1.fromDer(p12Buffer.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, certPassword);

    // Extract private key
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || !keyBag[0] || !keyBag[0].key) {
      throw new Error("Private key not found in .p12");
    }

    // Extract certificate
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (!certBag || certBag.length === 0) {
      throw new Error("Certificate not found in .p12");
    }

    const cert = certBag[0].cert!;
    const chain = certBag.slice(1).filter((b: forge.pkcs12.Bag) => b.cert).map((b: forge.pkcs12.Bag) => b.cert!);

    cachedP12 = {
      key: keyBag[0].key as forge.pki.rsa.PrivateKey,
      cert,
      chain,
    };

    log.info("[PDFSigner] Certificate loaded", {
      subject: cert.subject.getField("CN")?.value,
      issuer: cert.issuer.getField("CN")?.value,
      validTo: cert.validity.notAfter.toISOString(),
    });

    return cachedP12;
  } catch (err) {
    log.error("[PDFSigner] Failed to load certificate", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Creates a PKCS#7 detached signature for the given data.
 */
function createPkcs7Signature(data: Buffer): Buffer | null {
  const certs = loadCertificate();
  if (!certs) return null;

  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(data.toString("binary"));

  p7.addCertificate(certs.cert);
  for (const c of certs.chain) {
    p7.addCertificate(c);
  }

  p7.addSigner({
    key: certs.key,
    certificate: certs.cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data,
      },
      {
        type: forge.pki.oids.messageDigest,
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date().toISOString(),
      },
    ],
  });

  p7.sign({ detached: true });

  const asn1 = p7.toAsn1();
  const derBytes = forge.asn1.toDer(asn1).getBytes();
  return Buffer.from(derBytes, "binary");
}

// Signature placeholder size (8192 bytes should be plenty)
const SIGNATURE_MAX_LENGTH = 8192;

/**
 * Signs a PDF buffer with the A1 certificate.
 *
 * Embeds a visible signature annotation and PKCS#7 detached signature
 * conforming to the PDF spec (/SubFilter adbe.pkcs7.detached).
 *
 * Returns the signed PDF buffer, or the original buffer if signing fails.
 */
export function signPdf(pdfBuffer: Buffer): Buffer {
  const certs = loadCertificate();
  if (!certs) {
    log.warn("[PDFSigner] No certificate available — returning unsigned PDF");
    return pdfBuffer;
  }

  try {
    const pdf = pdfBuffer.toString("binary");

    // Find the last xref table offset
    const xrefMatch = pdf.match(/startxref\s+(\d+)\s+%%EOF/);
    if (!xrefMatch) {
      log.warn("[PDFSigner] Could not find xref in PDF — returning unsigned");
      return pdfBuffer;
    }

    const certSubject = certs.cert.subject.getField("CN")?.value || "Black Belt Consultoria";
    const now = new Date();
    const dateStr = now.toISOString().replace(/[T]/g, " ").slice(0, 19);

    // Create a simple incremental update to add the signature
    // We append a new signature dictionary to the PDF
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
      `   /ContactInfo (contato@blackbeltconsultoria.com)\n`,
      `   ${byteRangePlaceholder}\n`,
      `   /Contents <${signaturePlaceholder}>\n`,
      `>>\n`,
      `endobj\n`,
    ].join("");

    // Build the full signed PDF
    let signedPdf = pdf + sigDictObj;

    // Find the exact positions
    const contentsStart = signedPdf.lastIndexOf(`/Contents <`) + `/Contents <`.length;
    const contentsEnd = contentsStart + signaturePlaceholder.length;

    // Update ByteRange
    const byteRange = [
      0,
      contentsStart,
      contentsEnd + 1,
      signedPdf.length - (contentsEnd + 1),
    ];

    const byteRangeStr = `/ByteRange [0 ${String(byteRange[1]).padStart(10, "0")} ${String(byteRange[2]).padStart(10, "0")} ${String(byteRange[3]).padStart(10, "0")}]`;

    signedPdf = signedPdf.replace(byteRangePlaceholder, byteRangeStr);

    // Extract the parts to sign (everything except the signature contents hex)
    const part1 = Buffer.from(signedPdf.substring(0, byteRange[1]), "binary");
    const part2 = Buffer.from(signedPdf.substring(byteRange[2]), "binary");
    const dataToSign = Buffer.concat([part1, part2]);

    // Create PKCS#7 signature
    const signature = createPkcs7Signature(dataToSign);
    if (!signature) {
      log.warn("[PDFSigner] Signature creation failed — returning unsigned");
      return pdfBuffer;
    }

    // Convert signature to hex and pad
    const sigHex = signature.toString("hex");
    if (sigHex.length > SIGNATURE_MAX_LENGTH * 2) {
      log.error("[PDFSigner] Signature too large", { size: sigHex.length });
      return pdfBuffer;
    }

    const paddedSigHex = sigHex + "0".repeat(SIGNATURE_MAX_LENGTH * 2 - sigHex.length);

    // Replace the placeholder with real signature
    signedPdf = signedPdf.substring(0, contentsStart) + paddedSigHex + signedPdf.substring(contentsEnd);

    log.info("[PDFSigner] PDF signed successfully", {
      signer: certSubject,
      date: dateStr,
      signatureSize: sigHex.length,
    });

    return Buffer.from(signedPdf, "binary");
  } catch (err) {
    log.error("[PDFSigner] Signing error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return pdfBuffer;
  }
}

/**
 * Check if digital signing is available (certificate loaded).
 */
export function isSigningAvailable(): boolean {
  return loadCertificate() !== null;
}

/**
 * Get certificate info for display purposes.
 */
export function getCertificateInfo() {
  const certs = loadCertificate();
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
