import nodemailer from "nodemailer";

// Configuração do transporte de email (usando variáveis de ambiente)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Envia um email usando o transporte configurado
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("[Email] SMTP credentials not configured, skipping email send");
      return false;
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

/**
 * Envia convite para responder ao COPSOQ-II
 */
export async function sendCopsoqInvite(params: {
  respondentEmail: string;
  respondentName: string;
  assessmentTitle: string;
  inviteToken: string;
  expiresIn: number; // dias
}): Promise<boolean> {
  const { respondentEmail, respondentName, assessmentTitle, inviteToken, expiresIn } = params;

  const inviteUrl = `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/copsoq/respond/${inviteToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Avaliação COPSOQ-II</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Sua opinião é importante para nós</p>
      </div>

      <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Olá <strong>${respondentName}</strong>,
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Você foi convidado para participar da avaliação de riscos psicossociais <strong>"${assessmentTitle}"</strong>.
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Esta é uma avaliação confidencial que nos ajudará a entender melhor o ambiente de trabalho e implementar melhorias.
        </p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">Como responder:</p>
          <ol style="margin: 0; padding-left: 20px; font-size: 14px; color: #666;">
            <li style="margin: 8px 0;">Clique no botão abaixo para acessar o formulário</li>
            <li style="margin: 8px 0;">Responda todas as 76 questões com sinceridade</li>
            <li style="margin: 8px 0;">Suas respostas serão mantidas em sigilo</li>
            <li style="margin: 8px 0;">O tempo médio para conclusão é de 15-20 minutos</li>
          </ol>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: #667eea; color: white; padding: 12px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            Responder Avaliação
          </a>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; color: #999; text-align: center;">
          Este link expira em ${expiresIn} dias. Se você não conseguir acessar, entre em contato com o departamento de RH.
        </p>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
        <p style="margin: 0;">
          Black Belt Consultoria | Plataforma de Gestão de Riscos Psicossociais
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: respondentEmail,
    subject: `Convite para Avaliação: ${assessmentTitle}`,
    html,
    text: `Você foi convidado para responder a avaliação "${assessmentTitle}". Acesse: ${inviteUrl}`,
  });
}

/**
 * Envia email em lote para múltiplos respondentes
 */
export async function sendBulkCopsoqInvites(invites: Array<{
  respondentEmail: string;
  respondentName: string;
  assessmentTitle: string;
  inviteToken: string;
  expiresIn: number;
}>): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const invite of invites) {
    const result = await sendCopsoqInvite(invite);
    if (result) {
      success++;
    } else {
      failed++;
    }
    // Aguarda 1 segundo entre emails para evitar rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { success, failed };
}

/**
 * Envia email de confirmação de resposta
 */
export async function sendResponseConfirmation(params: {
  respondentEmail: string;
  respondentName: string;
  assessmentTitle: string;
}): Promise<boolean> {
  const { respondentEmail, respondentName, assessmentTitle } = params;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">✓ Resposta Recebida</h1>
      </div>

      <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Olá <strong>${respondentName}</strong>,
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Obrigado por responder a avaliação <strong>"${assessmentTitle}"</strong>!
        </p>

        <div style="background: #f0fdf4; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #166534;">
            Suas respostas foram registradas com sucesso e contribuirão para melhorias no ambiente de trabalho.
          </p>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; color: #666;">
          Se você tiver dúvidas, entre em contato com o departamento de RH.
        </p>
      </div>

      <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; font-size: 12px; color: #666; text-align: center;">
        <p style="margin: 0;">
          Black Belt Consultoria | Plataforma de Gestão de Riscos Psicossociais
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: respondentEmail,
    subject: `Confirmação: Avaliação ${assessmentTitle} Concluída`,
    html,
    text: `Sua resposta para a avaliação "${assessmentTitle}" foi registrada com sucesso.`,
  });
}
