/**
 * Shared TOTP helpers (RFC 6238)
 * Used by twoFactor router and auth-local (verify2FA endpoint).
 */

import crypto from "crypto";

const TOTP_WINDOW = 30; // 30 second window
const TOTP_DIGITS = 6;

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode Buffer para base32 (RFC 4648)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }

  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Decode base32 para Buffer
 */
export function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  let bits = "";

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Caractere base32 invalido");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

/**
 * Generate TOTP code from secret (base32 encoded)
 */
export function generateTOTP(secret: string, timeStep?: number): string {
  const time = timeStep || Math.floor(Date.now() / 1000 / TOTP_WINDOW);
  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", secretBuffer);

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0); // high 32 bits
  timeBuffer.writeUInt32BE(time, 4); // low 32 bits
  hmac.update(timeBuffer);

  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );

  return (code % Math.pow(10, TOTP_DIGITS)).toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Verify TOTP code com janela de tolerancia
 */
export function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, currentTime + i);
    // Comparacao timing-safe para evitar timing attacks
    if (
      expectedCode.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(code))
    ) {
      return true;
    }
  }

  return false;
}
