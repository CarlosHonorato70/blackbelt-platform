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
      console.warn(
        "[Email] SMTP credentials not configured, skipping email send"
      );
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
  const {
    respondentEmail,
    respondentName,
    assessmentTitle,
    inviteToken,
    expiresIn,
  } = params;

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
export async function sendBulkCopsoqInvites(
  invites: Array<{
    respondentEmail: string;
    respondentName: string;
    assessmentTitle: string;
    inviteToken: string;
    expiresIn: number;
  }>
): Promise<{ success: number; failed: number }> {
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
    await new Promise(resolve => setTimeout(resolve, 1000));
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

/**
 * Envia email de lembrete para respondentes que ainda não completaram a avaliação
 */
export async function sendReminderEmail(params: {
  respondentEmail: string;
  respondentName: string;
  inviteToken: string;
  reminderNumber: number;
  assessmentTitle: string;
}): Promise<boolean> {
  const {
    respondentEmail,
    respondentName,
    inviteToken,
    reminderNumber,
    assessmentTitle,
  } = params;

  const inviteUrl = `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/copsoq/respond/${inviteToken}`;

  const reminderMessages = {
    1: {
      title: "Lembrete: Avaliação COPSOQ-II Pendente",
      message:
        "Notamos que você ainda não respondeu a avaliação. Gostaria de lembrar que sua participação é muito importante para nós.",
    },
    2: {
      title: "Último Lembrete: Avaliação COPSOQ-II",
      message:
        "Esta é uma última oportunidade para responder a avaliação. Sua opinião é fundamental para melhorias no ambiente de trabalho.",
    },
    3: {
      title: "Avaliação COPSOQ-II Expirando em Breve",
      message:
        "O prazo para responder a avaliação está se aproximando. Por favor, complete a avaliação nos próximos dias.",
    },
  };

  const reminder =
    reminderMessages[reminderNumber as keyof typeof reminderMessages] ||
    reminderMessages[1];

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">⏰ ${reminder.title}</h1>
      </div>

      <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Olá <strong>${respondentName}</strong>,
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          ${reminder.message}
        </p>

        <div style="background: #fef3c7; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Avaliação:</strong> ${assessmentTitle}<br>
            <strong>Tempo estimado:</strong> 15-20 minutos<br>
            <strong>Confidencialidade:</strong> Suas respostas são totalmente confidenciais
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="background: #f59e0b; color: white; padding: 12px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            Responder Agora
          </a>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; color: #999; text-align: center;">
          Se você já respondeu esta avaliação, por favor ignore este email.
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
    subject: reminder.title,
    html,
    text: `${reminder.message} Acesse: ${inviteUrl}`,
  });
}

/**
 * Envia proposta comercial baseada em avaliação de riscos
 */
export async function sendProposalEmail(params: {
  clientEmail: string;
  clientName: string;
  proposalId: string;
  proposalTitle: string;
  totalValue: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  services: Array<{ name: string; quantity: number; unitPrice: number }>;
  validUntil?: Date;
}): Promise<boolean> {
  const {
    clientEmail,
    clientName,
    proposalId,
    proposalTitle,
    totalValue,
    riskLevel,
    services,
    validUntil,
  } = params;

  const proposalUrl = `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/proposals/${proposalId}`;
  
  const riskLevelColors = {
    low: { bg: "#dcfce7", border: "#10b981", text: "#166534", label: "Baixo" },
    medium: { bg: "#fef3c7", border: "#f59e0b", text: "#92400e", label: "Médio" },
    high: { bg: "#fee2e2", border: "#ef4444", text: "#991b1b", label: "Alto" },
    critical: { bg: "#fce7f3", border: "#db2777", text: "#831843", label: "Crítico" },
  };

  const riskStyle = riskLevelColors[riskLevel];
  const formattedValue = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(totalValue / 100);

  const servicesHtml = services
    .map(
      service => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">${service.name}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: center;">${service.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; text-align: right;">
            ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.unitPrice / 100)}
          </td>
        </tr>
      `
    )
    .join("");

  const validityText = validUntil
    ? `Esta proposta é válida até ${new Intl.DateTimeFormat("pt-BR").format(validUntil)}.`
    : "Entre em contato para discutir prazos e condições.";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">Proposta Comercial</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Black Belt Consultoria</p>
      </div>

      <div style="background: white; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 0 0 20px 0; font-size: 16px;">
          Prezado(a) <strong>${clientName}</strong>,
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14px; color: #666;">
          Com base na avaliação de riscos psicossociais realizada, preparamos uma proposta personalizada de serviços para sua organização.
        </p>

        <div style="background: ${riskStyle.bg}; padding: 20px; border-left: 4px solid ${riskStyle.border}; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px; color: ${riskStyle.text};">
            <strong>Nível de Risco Identificado:</strong> ${riskStyle.label}<br>
            <strong>Proposta:</strong> ${proposalTitle}
          </p>
        </div>

        <h2 style="font-size: 18px; color: #333; margin: 30px 0 15px 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
          Serviços Recomendados
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-size: 14px; font-weight: 600; border-bottom: 2px solid #667eea;">Serviço</th>
              <th style="padding: 12px; text-align: center; font-size: 14px; font-weight: 600; border-bottom: 2px solid #667eea;">Quantidade</th>
              <th style="padding: 12px; text-align: right; font-size: 14px; font-weight: 600; border-bottom: 2px solid #667eea;">Valor Unit.</th>
            </tr>
          </thead>
          <tbody>
            ${servicesHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 20px 12px; text-align: right; font-size: 16px; font-weight: bold;">
                Valor Total:
              </td>
              <td style="padding: 20px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #667eea;">
                ${formattedValue}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 30px 0;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333;">Por que estes serviços?</h3>
          <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.6;">
            Nossa proposta foi elaborada considerando os riscos psicossociais identificados na avaliação. 
            Os serviços selecionados visam não apenas a conformidade com a NR-01, mas também a criação 
            de um ambiente de trabalho mais saudável e produtivo.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${proposalUrl}" style="background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">
            Ver Proposta Completa
          </a>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; color: #999; text-align: center;">
          ${validityText}
        </p>
      </div>

      <div style="background: #f9fafb; padding: 25px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="font-size: 13px; color: #666; margin-bottom: 15px;">
          <strong style="color: #333;">Diferenciais Black Belt:</strong>
          <ul style="margin: 10px 0; padding-left: 20px; line-height: 1.8;">
            <li>Mais de 20 anos de experiência em segurança e saúde ocupacional</li>
            <li>9.000+ atendimentos clínicos realizados</li>
            <li>Metodologias proprietárias validadas</li>
            <li>Abordagem focada em alta performance, não apenas compliance</li>
          </ul>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #666; text-align: center;">
          Black Belt Consultoria | Plataforma de Gestão de Riscos Psicossociais<br>
          <a href="mailto:contato@blackbelt.com.br" style="color: #667eea; text-decoration: none;">contato@blackbelt.com.br</a>
        </p>
      </div>
    </div>
  `;

  const textContent = `
Proposta Comercial - Black Belt Consultoria

Prezado(a) ${clientName},

Com base na avaliação de riscos psicossociais realizada, preparamos uma proposta personalizada.

Nível de Risco: ${riskStyle.label}
Proposta: ${proposalTitle}

Serviços Recomendados:
${services.map(s => `- ${s.name} (${s.quantity} x ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(s.unitPrice / 100)})`).join("\n")}

Valor Total: ${formattedValue}

${validityText}

Acesse a proposta completa: ${proposalUrl}

Black Belt Consultoria
contato@blackbelt.com.br
  `.trim();

  return sendEmail({
    to: clientEmail,
    subject: `Proposta: ${proposalTitle} - Black Belt Consultoria`,
    html,
    text: textContent,
  });
}
