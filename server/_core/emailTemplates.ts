/**
 * Phase 5: Email Templates with White-Label Branding
 * 
 * Provides customizable email templates that respect tenant branding:
 * - Custom logo
 * - Custom colors
 * - Custom sender name and email
 */

import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface BrandingConfig {
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  senderName?: string | null;
  senderEmail?: string | null;
}

/**
 * Get branding configuration for a tenant
 */
export async function getTenantBranding(
  tenantId: string
): Promise<BrandingConfig> {
  const db = await getDb();
  if (!db) {
    return getDefaultBranding();
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: {
      name: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      emailSenderName: true,
      emailSenderEmail: true,
      whiteLabelEnabled: true,
    },
  });

  if (!tenant) {
    return getDefaultBranding();
  }

  // Only use custom branding if white-label is enabled
  if (!tenant.whiteLabelEnabled) {
    return getDefaultBranding(tenant.name);
  }

  return {
    logoUrl: tenant.logoUrl,
    primaryColor: tenant.primaryColor || "#3b82f6",
    secondaryColor: tenant.secondaryColor || "#10b981",
    companyName: tenant.name,
    senderName: tenant.emailSenderName,
    senderEmail: tenant.emailSenderEmail,
  };
}

/**
 * Get default Black Belt Platform branding
 */
export function getDefaultBranding(companyName?: string): BrandingConfig {
  return {
    logoUrl: process.env.DEFAULT_LOGO_URL || null,
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    companyName: companyName || "Black Belt Platform",
    senderName: "Black Belt Platform",
    senderEmail: process.env.EMAIL_FROM || "noreply@blackbelt-platform.com",
  };
}

/**
 * Base email template with branding
 */
export function getEmailTemplate(
  branding: BrandingConfig,
  content: string
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email - ${branding.companyName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${branding.primaryColor};
      padding: 30px 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: ${branding.primaryColor};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
    }
    .footer a {
      color: ${branding.primaryColor};
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header with logo -->
    <div class="header">
      ${
        branding.logoUrl
          ? `<img src="${branding.logoUrl}" alt="${branding.companyName}" class="logo" />`
          : `<h1 style="color: white; margin: 0;">${branding.companyName}</h1>`
      }
    </div>

    <!-- Email content -->
    <div class="content">
      ${content}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        Este email foi enviado por <strong>${branding.companyName}</strong><br>
        Se você recebeu este email por engano, por favor ignore.
      </p>
      <p style="margin-top: 15px;">
        <a href="https://blackbelt-platform.com">blackbelt-platform.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Welcome email template
 */
export function getWelcomeEmailTemplate(
  branding: BrandingConfig,
  userName: string,
  loginUrl: string
): string {
  const content = `
    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">
      Bem-vindo(a) à ${branding.companyName}!
    </h2>
    
    <p>Olá ${userName},</p>
    
    <p>
      É um prazer tê-lo(a) conosco! Sua conta foi criada com sucesso e você já pode começar a usar nossa plataforma.
    </p>
    
    <p>
      Para acessar sua conta, clique no botão abaixo:
    </p>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Acessar Plataforma</a>
    </div>
    
    <p>
      Se você tiver alguma dúvida ou precisar de ajuda, não hesite em nos contatar.
    </p>
    
    <p>
      Atenciosamente,<br>
      <strong>Equipe ${branding.companyName}</strong>
    </p>
  `;

  return getEmailTemplate(branding, content);
}

/**
 * Proposal sent email template
 */
export function getProposalEmailTemplate(
  branding: BrandingConfig,
  clientName: string,
  proposalNumber: string,
  totalValue: string,
  message?: string
): string {
  const content = `
    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">
      Nova Proposta Comercial
    </h2>
    
    <p>Prezado(a) ${clientName},</p>
    
    ${message ? `<p>${message}</p>` : ""}
    
    <p>
      Segue em anexo a proposta comercial <strong>#${proposalNumber}</strong> elaborada especialmente para você.
    </p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Proposta:</strong> #${proposalNumber}<br>
        <strong>Valor Total:</strong> ${totalValue}
      </p>
    </div>
    
    <p>
      Estamos à disposição para esclarecer qualquer dúvida e negociar os melhores termos.
    </p>
    
    <p>
      Atenciosamente,<br>
      <strong>Equipe ${branding.companyName}</strong>
    </p>
  `;

  return getEmailTemplate(branding, content);
}

/**
 * Password reset email template
 */
export function getPasswordResetEmailTemplate(
  branding: BrandingConfig,
  userName: string,
  resetUrl: string
): string {
  const content = `
    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">
      Redefinição de Senha
    </h2>
    
    <p>Olá ${userName},</p>
    
    <p>
      Recebemos uma solicitação para redefinir a senha da sua conta na ${branding.companyName}.
    </p>
    
    <p>
      Para criar uma nova senha, clique no botão abaixo:
    </p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="button">Redefinir Senha</a>
    </div>
    
    <p style="color: #d32f2f; background-color: #ffebee; padding: 15px; border-radius: 5px; font-size: 14px;">
      <strong>Atenção:</strong> Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
    </p>
    
    <p style="font-size: 12px; color: #666;">
      Este link expira em 24 horas por motivos de segurança.
    </p>
    
    <p>
      Atenciosamente,<br>
      <strong>Equipe ${branding.companyName}</strong>
    </p>
  `;

  return getEmailTemplate(branding, content);
}

/**
 * Invoice email template
 */
export function getInvoiceEmailTemplate(
  branding: BrandingConfig,
  clientName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string
): string {
  const content = `
    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">
      Fatura de Cobrança
    </h2>
    
    <p>Prezado(a) ${clientName},</p>
    
    <p>
      Segue em anexo a fatura referente à sua assinatura da ${branding.companyName}.
    </p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Fatura:</strong> #${invoiceNumber}<br>
        <strong>Valor:</strong> ${amount}<br>
        <strong>Vencimento:</strong> ${dueDate}
      </p>
    </div>
    
    <p>
      Por favor, efetue o pagamento até a data de vencimento para manter o acesso à plataforma.
    </p>
    
    <p>
      Em caso de dúvidas, entre em contato conosco.
    </p>
    
    <p>
      Atenciosamente,<br>
      <strong>Equipe ${branding.companyName}</strong>
    </p>
  `;

  return getEmailTemplate(branding, content);
}

/**
 * Subscription reminder email template
 */
export function getSubscriptionReminderTemplate(
  branding: BrandingConfig,
  clientName: string,
  planName: string,
  renewalDate: string,
  amount: string
): string {
  const content = `
    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">
      Lembrete de Renovação
    </h2>
    
    <p>Olá ${clientName},</p>
    
    <p>
      Sua assinatura do plano <strong>${planName}</strong> será renovada em breve.
    </p>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #666;">
        <strong>Plano:</strong> ${planName}<br>
        <strong>Data de Renovação:</strong> ${renewalDate}<br>
        <strong>Valor:</strong> ${amount}
      </p>
    </div>
    
    <p>
      A cobrança será processada automaticamente no método de pagamento cadastrado.
    </p>
    
    <p>
      Se você deseja fazer alguma alteração, acesse sua conta antes da data de renovação.
    </p>
    
    <p>
      Atenciosamente,<br>
      <strong>Equipe ${branding.companyName}</strong>
    </p>
  `;

  return getEmailTemplate(branding, content);
}
