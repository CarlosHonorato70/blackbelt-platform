// Type stubs for packages without bundled type declarations

declare module "nodemailer" {
  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: { user?: string; pass?: string };
    [key: string]: unknown;
  }
  export interface MailOptions {
    from?: string;
    to?: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename?: string;
      content?: Buffer | string;
      path?: string;
      contentType?: string;
    }>;
    [key: string]: unknown;
  }
  export interface SentMessageInfo {
    messageId: string;
    accepted: string[];
    rejected: string[];
    response: string;
    [key: string]: unknown;
  }
  export interface Transporter {
    sendMail(mailOptions: MailOptions): Promise<SentMessageInfo>;
    verify(): Promise<boolean>;
  }
  export function createTransport(options: TransportOptions | string): Transporter;
  export function createTransport(options: unknown): Transporter;
}

declare module "cors" {
  import type { RequestHandler, Request, Response, NextFunction } from "express";
  export interface CorsOptions {
    origin?: string | string[] | boolean | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }
  function cors(options?: CorsOptions): RequestHandler;
  export default cors;
}

declare module "pdfkit" {
  interface PDFDocumentOptions {
    size?: string | [number, number];
    margins?: { top?: number; left?: number; bottom?: number; right?: number };
    layout?: "portrait" | "landscape";
    compress?: boolean;
    info?: Record<string, string>;
    [key: string]: unknown;
  }
  interface PDFTextOptions {
    align?: "left" | "center" | "right" | "justify";
    width?: number;
    height?: number;
    lineBreak?: boolean;
    paragraphGap?: number;
    indent?: number;
    columns?: number;
    continued?: boolean;
    [key: string]: unknown;
  }
  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    page: { width: number; height: number };
    x: number;
    y: number;
    pipe(destination: NodeJS.WritableStream): this;
    end(): void;
    font(src: string, size?: number): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    strokeColor(color: string): this;
    text(text: string, options?: PDFTextOptions): this;
    text(text: string, x: number, y: number, options?: PDFTextOptions): this;
    text(text: string, x?: number | PDFTextOptions, y?: number, options?: PDFTextOptions): this;
    moveDown(lines?: number): this;
    moveUp(lines?: number): this;
    addPage(options?: PDFDocumentOptions): this;
    rect(x: number, y: number, w: number, h: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    fillAndStroke(fillColor?: string, strokeColor?: string): this;
    image(src: string | Buffer, x?: number, y?: number, options?: Record<string, unknown>): this;
    lineWidth(width: number): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    save(): this;
    restore(): this;
    on(event: "data", listener: (chunk: Buffer) => void): this;
    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
    [key: string]: unknown;
  }
  export = PDFDocument;
}

declare module "jose" {
  export interface JWTPayload {
    iss?: string;
    sub?: string;
    aud?: string | string[];
    exp?: number;
    iat?: number;
    jti?: string;
    [key: string]: unknown;
  }
  export interface JWTVerifyResult {
    payload: JWTPayload;
    protectedHeader: { alg: string; [key: string]: unknown };
  }
  export class SignJWT {
    constructor(payload: JWTPayload);
    setProtectedHeader(header: { alg: string; typ?: string; [key: string]: unknown }): this;
    setExpirationTime(time: number | string): this;
    setIssuedAt(time?: number): this;
    sign(key: Uint8Array | CryptoKey): Promise<string>;
  }
  export function jwtVerify(
    jwt: string,
    key: Uint8Array | CryptoKey,
    options?: { algorithms?: string[]; [key: string]: unknown }
  ): Promise<JWTVerifyResult>;
}
