const https = require("https");

const token = "c1885142699d0c7ae06082cc8d0f9028a1b36213b1bc3c641699582f43697e23";
const baseUrl = "https://blackbeltconsultoria.com";
const approveUrl = `${baseUrl}/api/proposal/approve/${token}`;
const rejectUrl = `${baseUrl}/api/proposal/reject/${token}`;

const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin: 0;">Black Belt Consultoria</h1>
    <p style="color: #666; font-size: 14px;">Gestão de Riscos Psicossociais</p>
  </div>

  <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #333; margin-top: 0;">Pré-Proposta Comercial</h2>
    <p style="color: #555;">Prezado(a),</p>
    <p style="color: #555;">Segue a pré-proposta para adequação à NR-01 (riscos psicossociais):</p>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #e9ecef;">
        <td style="padding: 12px; font-weight: bold; border: 1px solid #dee2e6;">Empresa</td>
        <td style="padding: 12px; border: 1px solid #dee2e6;">HR CONVENIENCIA</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: bold; border: 1px solid #dee2e6;">CNPJ</td>
        <td style="padding: 12px; border: 1px solid #dee2e6;">30.428.133/0001-24</td>
      </tr>
      <tr style="background: #e9ecef;">
        <td style="padding: 12px; font-weight: bold; border: 1px solid #dee2e6;">Colaboradores</td>
        <td style="padding: 12px; border: 1px solid #dee2e6;">3</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: bold; border: 1px solid #dee2e6;">Investimento Estimado</td>
        <td style="padding: 12px; border: 1px solid #dee2e6; color: #28a745; font-weight: bold; font-size: 18px;">R$ 1.800,00 a R$ 2.800,00</td>
      </tr>
    </table>

    <h3 style="color: #333;">Serviços Inclusos:</h3>
    <ul style="color: #555; line-height: 1.8;">
      <li>Aplicação do questionário COPSOQ-II</li>
      <li>Análise de riscos psicossociais</li>
      <li>Inventário de riscos</li>
      <li>Plano de ação personalizado</li>
      <li>Programa de treinamento</li>
      <li>Certificado de conformidade NR-01</li>
      <li>Relatórios completos</li>
    </ul>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${approveUrl}" style="display: inline-block; background: #28a745; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; margin: 5px;">✅ Aprovar Proposta</a>
    <br><br>
    <a href="${rejectUrl}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-size: 14px; margin: 5px;">❌ Recusar</a>
  </div>

  <div style="border-top: 1px solid #dee2e6; padding-top: 20px; text-align: center; color: #999; font-size: 12px;">
    <p>Black Belt Consultoria SST</p>
    <p>contato@blackbeltconsultoria.com</p>
  </div>
</body>
</html>`;

const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASS;
if (!apiKey) {
  console.error("No BREVO_API_KEY or SMTP_PASS found");
  process.exit(1);
}

const data = JSON.stringify({
  sender: { name: "Black Belt Consultoria", email: "contato@blackbeltconsultoria.com" },
  to: [{ email: "coach.honorato@gmail.com", name: "HR Conveniencia" }],
  subject: "Pré-Proposta Comercial - Adequação NR-01 | HR CONVENIENCIA",
  htmlContent: htmlContent
});

const options = {
  hostname: "api.brevo.com",
  path: "/v3/smtp/email",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "api-key": apiKey,
    "Content-Length": Buffer.byteLength(data)
  }
};

const req = https.request(options, (res) => {
  let body = "";
  res.on("data", d => body += d);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", body);
  });
});
req.on("error", e => console.error("Error:", e.message));
req.write(data);
req.end();
