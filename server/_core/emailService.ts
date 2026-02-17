/**
 * Email Service for sending PDFs
 * Uses nodemailer to send PDF attachments
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email configuration (unified — uses SMTP_* env vars same as email.ts)
const EMAIL_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const EMAIL_PORT = parseInt(process.env.SMTP_PORT || "587");
const EMAIL_USER = process.env.SMTP_USER;
const EMAIL_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.SMTP_FROM || EMAIL_USER;

let transporter: Transporter | null = null;

/**
 * Initialize email transporter
 */
function getEmailTransporter(): Transporter {
  if (!transporter) {
    if (!EMAIL_USER || !EMAIL_PASSWORD) {
      throw new Error("Email credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD");
    }

    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
      },
    });
  }

  return transporter;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!(EMAIL_USER && EMAIL_PASSWORD);
}

export interface EmailPdfAttachment {
  filename: string;
  content: Buffer;
}

export interface SendPdfEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachment: EmailPdfAttachment;
  cc?: string[];
  bcc?: string[];
}

/**
 * Send email with PDF attachment
 */
export async function sendPdfEmail(options: SendPdfEmailOptions): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error("Email service not configured. Cannot send PDF.");
  }

  const transporter = getEmailTransporter();

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    text: options.text,
    html: options.html || options.text.replace(/\n/g, "<br>"),
    attachments: [
      {
        filename: options.attachment.filename,
        content: options.attachment.content,
        contentType: "application/pdf",
      },
    ],
  });
}

/**
 * Send proposal PDF by email
 */
export async function sendProposalEmail(
  to: string,
  proposalNumber: string,
  clientName: string,
  pdfBuffer: Buffer,
  companyName: string = "Black Belt Platform"
): Promise<void> {
  const subject = `Proposta ${proposalNumber} - ${companyName}`;
  const text = `Olá ${clientName},\n\nSegue em anexo a proposta ${proposalNumber}.\n\nFicamos à disposição para quaisquer dúvidas.\n\nAtenciosamente,\n${companyName}`;

  await sendPdfEmail({
    to,
    subject,
    text,
    attachment: {
      filename: `proposta-${proposalNumber}.pdf`,
      content: pdfBuffer,
    },
  });
}

/**
 * Send assessment PDF by email
 */
export async function sendAssessmentEmail(
  to: string,
  assessmentNumber: string,
  companyName: string,
  pdfBuffer: Buffer,
  senderCompanyName: string = "Black Belt Platform"
): Promise<void> {
  const subject = `Relatório de Avaliação ${assessmentNumber} - ${senderCompanyName}`;
  const text = `Prezados,\n\nSegue em anexo o relatório de avaliação de riscos ${assessmentNumber} da empresa ${companyName}.\n\nEste documento contém informações detalhadas sobre os riscos identificados e as recomendações de adequação.\n\nAtenciosamente,\n${senderCompanyName}`;

  await sendPdfEmail({
    to,
    subject,
    text,
    attachment: {
      filename: `avaliacao-${assessmentNumber}.pdf`,
      content: pdfBuffer,
    },
  });
}

/**
 * Get email configuration
 */
export function getEmailConfig() {
  return {
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    user: EMAIL_USER,
    from: EMAIL_FROM,
    configured: isEmailConfigured(),
  };
}
