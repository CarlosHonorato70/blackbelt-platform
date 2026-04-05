/**
 * User Guide PDF Download Route
 * Generates a professional PDF user guide on-the-fly using the platform's PDF generator.
 * Authenticated route — only logged-in users can download.
 */

import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./_core/cookies";
import { generateGenericReportPdf, type PdfSection } from "./_core/pdfGenerator";
import { log } from "./_core/logger";

function buildUserGuideSections(): PdfSection[] {
  const sections: PdfSection[] = [];

  // ── Introdução ──
  sections.push({ type: "title", content: "1. Introdução" });
  sections.push({
    type: "text",
    content:
      "A Black Belt Platform é uma plataforma SaaS multi-tenant para gestão de riscos psicossociais ocupacionais, " +
      "em conformidade com a Portaria MTE nº 1.419/2024 (NR-01). A plataforma automatiza todo o ciclo de avaliação, " +
      "desde o diagnóstico inicial até a certificação de conformidade, utilizando inteligência artificial (SamurAI) " +
      "para guiar consultores e empresas em cada etapa do processo.",
  });
  sections.push({ type: "spacer" });

  // ── Primeiros Passos ──
  sections.push({ type: "title", content: "2. Primeiros Passos" });
  sections.push({ type: "subtitle", content: "2.1 Login e Acesso" });
  sections.push({
    type: "text",
    content:
      "Acesse a plataforma pelo endereço fornecido pela sua consultoria. Faça login com email e senha. " +
      "Na primeira vez, você receberá um convite por email com link de ativação.",
  });
  sections.push({ type: "subtitle", content: "2.2 Navegação" });
  sections.push({
    type: "text",
    content:
      "O menu lateral organiza as funcionalidades em grupos: Principal, Documentos NR-01, Acompanhamento, " +
      "Ferramentas, Comercial, Administração e Suporte. O menu é adaptável ao seu perfil de acesso.",
  });
  sections.push({ type: "subtitle", content: "2.3 Perfis de Acesso" });
  sections.push({
    type: "list",
    items: [
      "Administrador: Acesso total à plataforma, gestão de tenants e monitoramento",
      "Consultor: Gerencia empresas clientes, avaliações, propostas e documentos NR-01",
      "Administrador da Empresa: Visualiza avaliações e documentos da própria empresa",
      "Visualizador: Acesso somente leitura aos dados da empresa",
    ],
  });
  sections.push({ type: "spacer" });

  // ── SamurAI ──
  sections.push({ type: "title", content: "3. SamurAI — Agente de IA" });
  sections.push({
    type: "text",
    content:
      "O SamurAI é o agente de inteligência artificial da plataforma que guia o consultor por todo o processo " +
      "de conformidade NR-01 em 10 fases sequenciais, com transição automática entre elas.",
  });
  sections.push({ type: "subtitle", content: "As 10 Fases do SamurAI" });
  sections.push({
    type: "table",
    columns: [
      { header: "Fase", width: 40, align: "center" },
      { header: "Nome", width: 130 },
      { header: "Descrição", width: 340 },
    ],
    rows: [
      { cells: ["1", "Onboarding", "Cadastro da empresa com CNPJ, setor e número de colaboradores"] },
      { cells: ["2", "Diagnóstico", "Análise do perfil da empresa e definição da estratégia de avaliação"] },
      { cells: ["3", "Configuração", "Personalização da metodologia COPSOQ conforme porte da empresa"] },
      { cells: ["4", "Avaliação", "Aplicação do questionário COPSOQ-II (76 questões, 12 dimensões)"] },
      { cells: ["5", "Análise", "Análise das respostas por IA com identificação de dimensões críticas"] },
      { cells: ["6", "Inventário", "Geração do inventário de riscos psicossociais (13 tipos MTE)"] },
      { cells: ["7", "Plano de Ação", "Criação de medidas preventivas com hierarquia de controles"] },
      { cells: ["8", "Treinamento", "Programas de capacitação para riscos identificados"] },
      { cells: ["9", "Documentação", "Geração de PGR, PCMSO, laudos técnicos e documentos regulatórios"] },
      { cells: ["10", "Certificação", "Emissão do certificado de conformidade NR-01 (score >= 80%)"] },
    ],
  });
  sections.push({
    type: "text",
    content:
      "Como usar: Acesse Menu > SamurAI e converse com o agente. Informe o CNPJ da empresa e o SamurAI " +
      "conduzirá automaticamente cada fase, gerando documentos, avaliações e relatórios conforme necessário.",
  });
  sections.push({ type: "spacer" });

  // ── Avaliações NR-01 ──
  sections.push({ type: "title", content: "4. Avaliações de Riscos NR-01" });
  sections.push({
    type: "text",
    content:
      "O módulo de avaliações permite criar inventários de riscos psicossociais conforme o §1.5.7 da NR-01. " +
      "Cada avaliação inclui identificação de perigos (13 tipos MTE), classificação de risco por severidade " +
      "e probabilidade (matriz 5x5), e definição de controles existentes e recomendados.",
  });
  sections.push({ type: "subtitle", content: "5 Categorias de Risco GRO" });
  sections.push({
    type: "list",
    items: [
      "Trivial: Risco aceitável, sem ação necessária",
      "Tolerável: Monitoramento contínuo recomendado",
      "Moderado: Ações de controle em prazo definido",
      "Substancial: Ação urgente necessária",
      "Intolerável: Interrupção imediata da atividade",
    ],
  });
  sections.push({ type: "spacer" });

  // ── COPSOQ-II ──
  sections.push({ type: "title", content: "5. COPSOQ-II — Questionário Psicossocial" });
  sections.push({
    type: "text",
    content:
      "O COPSOQ-II (Copenhagen Psychosocial Questionnaire) é o instrumento principal para avaliação de riscos " +
      "psicossociais. Contém 76 questões distribuídas em 12 dimensões psicossociais.",
  });
  sections.push({ type: "subtitle", content: "12 Dimensões Avaliadas" });
  sections.push({
    type: "list",
    items: [
      "Exigências Quantitativas: Volume e ritmo de trabalho",
      "Ritmo de Trabalho: Pressão temporal e cadência",
      "Exigências Cognitivas: Complexidade e concentração",
      "Exigências Emocionais: Desgaste emocional no trabalho",
      "Influência no Trabalho: Autonomia e participação",
      "Possibilidade de Desenvolvimento: Crescimento profissional",
      "Significado do Trabalho: Propósito e motivação",
      "Compromisso com o Local: Vínculo organizacional",
      "Previsibilidade: Clareza sobre mudanças e futuro",
      "Transparência do Papel: Clareza de funções",
      "Apoio Social: Suporte de colegas e chefia",
      "Comunidade Social: Qualidade das relações de trabalho",
    ],
  });
  sections.push({
    type: "text",
    content:
      "Como aplicar: O SamurAI cria a avaliação automaticamente. Os colaboradores recebem um link por email " +
      "para responder o questionário de forma anônima. Após 70% de adesão, a análise é gerada automaticamente.",
  });
  sections.push({ type: "spacer" });

  // ── Pesquisas de Clima ──
  sections.push({ type: "title", content: "6. Pesquisas de Clima Organizacional" });
  sections.push({
    type: "text",
    content:
      "Além do COPSOQ-II, a plataforma oferece 3 instrumentos complementares para pesquisa de clima:",
  });
  sections.push({
    type: "table",
    columns: [
      { header: "Instrumento", width: 120 },
      { header: "Questões", width: 70, align: "center" },
      { header: "Dimensões", width: 70, align: "center" },
      { header: "Foco", width: 250 },
    ],
    rows: [
      { cells: ["EACT", "31", "3", "Contexto de trabalho: organização, condições e relações"] },
      { cells: ["ITRA", "32", "7", "Indicadores de prazer-sofrimento e danos relacionados ao trabalho"] },
      { cells: ["QVT-Walton", "35", "8", "Qualidade de vida no trabalho: compensação, condições, crescimento"] },
    ],
  });
  sections.push({ type: "spacer" });

  // ── Dashboard Psicossocial ──
  sections.push({ type: "title", content: "7. Dashboard Psicossocial" });
  sections.push({
    type: "text",
    content:
      "O Dashboard Psicossocial apresenta uma visão consolidada dos resultados das avaliações. " +
      "Recursos incluem: gráfico radar por dimensão, segmentação por setor e demografia, " +
      "tendências multi-ciclo para acompanhar a evolução ao longo do tempo, e comparação " +
      "com benchmarks setoriais (burnout, assédio e afastamentos por saúde mental).",
  });
  sections.push({ type: "spacer" });

  // ── Planos de Ação ──
  sections.push({ type: "title", content: "8. Planos de Ação" });
  sections.push({
    type: "text",
    content:
      "Os planos de ação são gerados automaticamente a partir dos riscos identificados. " +
      "Cada ação segue a hierarquia de controles da NR-01:",
  });
  sections.push({
    type: "list",
    items: [
      "Eliminação: Remover o perigo na origem",
      "Substituição: Substituir por alternativa menos perigosa",
      "Controles de Engenharia: Isolar o trabalhador do perigo",
      "Controles Administrativos: Mudar a organização do trabalho",
      "EPIs: Proteção individual como último recurso",
    ],
  });
  sections.push({
    type: "text",
    content:
      "Cada ação inclui: responsável, prazo, prioridade, indicador KPI e verificação de eficácia.",
  });
  sections.push({ type: "spacer" });

  // ── Documentos ──
  sections.push({ type: "title", content: "9. Documentos e PDFs Exportáveis" });
  sections.push({
    type: "text",
    content: "A plataforma gera mais de 20 tipos de documentos PDF com assinatura digital ICP-Brasil:",
  });
  sections.push({
    type: "list",
    items: [
      "Relatório COPSOQ-II: Análise completa das 12 dimensões",
      "Inventário de Riscos: Lista de perigos com classificação GRO",
      "Plano de Ação: Medidas preventivas com cronograma",
      "PGR Consolidado: Programa de Gerenciamento de Riscos",
      "PCMSO Integrado: Recomendações médicas por risco",
      "Relatório GRO: Gerenciamento de Riscos Ocupacionais",
      "Laudo Técnico: Laudo de riscos psicossociais",
      "Certificado de Conformidade NR-01",
      "Propostas Comerciais personalizáveis",
      "Relatórios de Pesquisa de Clima (EACT, ITRA, QVT)",
    ],
  });
  sections.push({ type: "spacer" });

  // ── Integração PGR/PCMSO ──
  sections.push({ type: "title", content: "10. Integração PGR/PCMSO" });
  sections.push({
    type: "text",
    content:
      "A integração com o PGR (NR-01) e PCMSO (NR-07) permite vincular riscos psicossociais " +
      "aos programas de saúde ocupacional. Inclui recomendações médicas por risco, registros de " +
      "exames ASO e geração de documentos integrados.",
  });
  sections.push({ type: "spacer" });

  // ── eSocial ──
  sections.push({ type: "title", content: "11. Exportação eSocial" });
  sections.push({
    type: "text",
    content:
      "O módulo eSocial gera XMLs para os eventos obrigatórios relacionados à SST:",
  });
  sections.push({
    type: "list",
    items: [
      "S-2210: Comunicação de Acidente de Trabalho (CAT)",
      "S-2220: Monitoramento da Saúde do Trabalhador (ASO)",
      "S-2240: Condições Ambientais do Trabalho — Agentes Nocivos",
    ],
  });
  sections.push({
    type: "text",
    content: "Os XMLs são validados automaticamente antes do envio, com detecção de pendências S-2240.",
  });
  sections.push({ type: "spacer" });

  // ── Certificações ──
  sections.push({ type: "title", content: "12. Certificações e Assinatura Digital" });
  sections.push({
    type: "text",
    content:
      "Cada consultoria pode cadastrar suas certificações profissionais (CRP, CREA, CRM, ISO, etc.) " +
      "e configurar a assinatura digital ICP-Brasil para todos os PDFs.",
  });
  sections.push({ type: "subtitle", content: "Como Ativar a Assinatura Digital (3 passos)" });
  sections.push({
    type: "list",
    items: [
      "1. Acesse Menu > Certificações > Nova Certificação",
      "2. Arraste o arquivo .p12 ou .pfx do seu certificado A1",
      "3. Informe a senha e clique em 'Ativar Assinatura Digital'",
    ],
  });
  sections.push({
    type: "text",
    content:
      "Pronto! Todos os PDFs gerados a partir desse momento terão assinatura digital no padrão " +
      "adbe.pkcs7.detached, compatível com Adobe Reader, Foxit e validadores ICP-Brasil.",
  });
  sections.push({ type: "spacer" });

  // ── Checklist de Conformidade ──
  sections.push({ type: "title", content: "13. Checklist de Conformidade" });
  sections.push({
    type: "text",
    content:
      "O checklist de conformidade contém 35 itens de verificação distribuídos em 5 normas regulamentadoras: " +
      "NR-01, NR-07, NR-09, NR-17 e NR-35. Cada item pode ser marcado como Conforme, Não Conforme ou " +
      "Não Aplicável. O score de conformidade precisa atingir 80% para emissão do certificado.",
  });
  sections.push({ type: "spacer" });

  // ── Suporte ──
  sections.push({ type: "title", content: "14. Suporte" });
  sections.push({
    type: "text",
    content:
      "A plataforma oferece dois canais de suporte: o Suporte IA (chatbot inteligente com base de " +
      "conhecimento da plataforma e legislação NR-01) e o Sistema de Tickets para atendimento humano. " +
      "Acesse pelo menu lateral em Suporte.",
  });
  sections.push({ type: "spacer" });

  // ── Canal de Denúncia ──
  sections.push({ type: "title", content: "15. Canal de Denúncia Anônimo" });
  sections.push({
    type: "text",
    content:
      "O Canal de Denúncia permite que colaboradores reportem situações de assédio, discriminação " +
      "ou riscos psicossociais de forma anônima. O denunciante recebe um código de acompanhamento " +
      "para consultar o status sem se identificar. O consultor gerencia as denúncias recebidas " +
      "em um painel dedicado.",
  });
  sections.push({ type: "spacer" });

  // ── Calculadora Financeira ──
  sections.push({ type: "title", content: "16. Calculadora de Risco Financeiro" });
  sections.push({
    type: "text",
    content:
      "A calculadora projeta o custo de não-conformidade com a NR-01, incluindo multas (até R$ 6.708,08/trabalhador), " +
      "afastamentos, ações trabalhistas e perda de produtividade. Também calcula o ROI da implementação do programa.",
  });
  sections.push({ type: "spacer" });

  // ── FAQ ──
  sections.push({ type: "title", content: "17. Perguntas Frequentes" });
  sections.push({ type: "subtitle", content: "O que é a NR-01 e quais são os prazos?" });
  sections.push({
    type: "text",
    content:
      "A Portaria MTE nº 1.419/2024 incluiu riscos psicossociais no GRO (Gerenciamento de Riscos Ocupacionais). " +
      "O prazo para conformidade é 26/05/2026. Todas as empresas com empregados CLT devem estar em conformidade.",
  });
  sections.push({ type: "subtitle", content: "Quanto tempo leva o processo completo?" });
  sections.push({
    type: "text",
    content:
      "Com o SamurAI, o processo completo pode ser concluído em 4 a 8 semanas, dependendo do porte " +
      "da empresa e da taxa de resposta dos colaboradores na avaliação COPSOQ-II.",
  });
  sections.push({ type: "subtitle", content: "Posso usar a plataforma no celular?" });
  sections.push({
    type: "text",
    content:
      "Sim! A plataforma é responsiva e pode ser instalada como aplicativo (PWA) no Android e iOS.",
  });
  sections.push({ type: "spacer" });

  // ── Contato ──
  sections.push({ type: "divider" });
  sections.push({ type: "title", content: "Contato" });
  sections.push({
    type: "text",
    content:
      "Email: contato@blackbeltconsultoria.com\n" +
      "Website: blackbeltconsultoria.com\n\n" +
      "Black Belt Consultoria, Mentoria e Treinamentos\n" +
      "Plataforma de Gestão de Riscos Psicossociais Ocupacionais — NR-01",
  });

  return sections;
}

export function registerUserGuideRoutes(app: Express) {
  app.get("/api/user-guide/download", async (req: Request, res: Response) => {
    try {
      // Authenticate
      const sessionToken = req.cookies?.[COOKIE_NAME];
      if (!sessionToken) {
        return res.status(401).json({ error: "Autenticação necessária" });
      }
      const result = verifySessionToken(sessionToken);
      if (!result) {
        return res.status(401).json({ error: "Sessão inválida" });
      }

      const sections = buildUserGuideSections();
      const today = new Date().toLocaleDateString("pt-BR");

      const pdfBuffer = await generateGenericReportPdf(
        {
          reportTitle: "Guia de Uso da Plataforma",
          reportSubtitle: "Black Belt Platform — Gestão de Riscos Psicossociais NR-01",
          referenceText: `Versão 2.0 — Atualizado em ${today}`,
          date: today,
          sections,
        },
        undefined,
        {
          title: "Guia de Uso — Black Belt Platform",
          subject: "Manual do Usuário",
          author: "Black Belt Consultoria",
          keywords: ["guia", "manual", "NR-01", "plataforma", "riscos psicossociais"],
        }
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="Guia_de_Uso_BlackBelt_Platform.pdf"');
      res.setHeader("Content-Length", pdfBuffer.length);
      res.send(pdfBuffer);

      log.info("[UserGuide] PDF downloaded", { userId: result.userId });
    } catch (err) {
      log.error("[UserGuide] Download error", {
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ error: "Erro ao gerar guia de uso" });
    }
  });
}
