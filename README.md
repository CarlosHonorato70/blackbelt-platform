# Black Belt Platform - Plataforma de Conformidade NR-01

[![GitHub](https://img.shields.io/badge/GitHub-CarlosHonorato70%2Fblackbelt--platform-blue?logo=github)](https://github.com/CarlosHonorato70/blackbelt-platform)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.13.0-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-purple)](https://trpc.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql)](https://www.mysql.com/)

## Visao Geral

**Black Belt Platform** e uma plataforma SaaS multi-tenant para gestao de riscos psicossociais e conformidade com a **NR-01** (Portaria MTE no 1.419/2024, vigencia 26/05/2026).

A plataforma automatiza todo o ciclo de conformidade: avaliacao COPSOQ-II, inventario de riscos, planos de acao, integracao PGR/PCMSO, exportacao eSocial, e geracao de 20+ documentos PDF — tudo orquestrado pelo **SamurAI**, agente de IA com 10 fases.

**78 paginas** | **47 routers tRPC** | **85 tabelas MySQL** | **20+ PDFs** | **3 instrumentos validados**

---

## Planos e Precos

Modelo hibrido: mensalidade fixa + cobranca por convite COPSOQ excedente.

| Plano | Preco | Empresas/mes | Convites COPSOQ | Excedente |
|-------|-------|-------------|-----------------|-----------|
| **Starter** (CPF) | R$ 297/mes | 3 | 20 inclusos | R$ 12/un |
| **Professional** (CNPJ) | R$ 597/mes | 10 | 100 inclusos | R$ 10/un |
| **Enterprise** (CNPJ) | R$ 997/mes | 30 | 500 inclusos | R$ 8/un |

**Pagamento:** PIX, cartao de credito ou boleto via Asaas

---

## Funcionalidades

### SamurAI — Agente de IA (10 Fases)

Agente inteligente que orquestra todo o processo de conformidade NR-01:

1. **Cadastro** — Consulta CNPJ na Receita Federal e cadastra empresa
2. **Diagnostico** — Analise inicial dos riscos
3. **Avaliacao COPSOQ-II** — Envio de convites e coleta de respostas (76 questoes, 12 dimensoes)
4. **Analise** — Processamento dos resultados com scoring por dimensao
5. **Inventario de Riscos** — Geracao automatica com 13 tipos de perigo MTE
6. **Plano de Acao** — Geracao com hierarquia de controle (eliminacao a EPI)
7. **Treinamento** — Programa de capacitacao
8. **Documentacao** — Geracao do GRO consolidado (8 secoes NR-01 §1.5)
9. **Certificacao** — Checklist de conformidade e certificado
10. **Monitoramento** — Acompanhamento continuo com alertas

- Auto-transicao de fases quando condicoes sao atendidas
- 20+ documentos PDF gerados automaticamente

### Modulo de Conformidade NR-01

- **Avaliacoes de Riscos** — 5 categorias GRO (Fisico, Quimico, Biologico, Ergonomico, Psicossocial) + 13 tipos de perigo MTE
- **COPSOQ-II** — 76 questoes, 12 dimensoes, reverse scoring, convites por email com lembretes
- **Inventario de Riscos** — Matriz probabilidade x gravidade, classificacao automatica
- **Planos de Acao** — Hierarquia de controle, cronograma mensal, verificacao de eficacia, indicadores de efetividade
- **GRO Consolidado** — Documento completo conforme NR-01 §1.5 (8 secoes obrigatorias)
- **Checklist de Conformidade** — 35 itens (NR-01, NR-07, NR-09, NR-17, NR-35) com auto-seed
- **Devolutiva aos Trabalhadores** — Disseminacao de resultados anonimizados por email

### Pesquisas de Clima Organizacional

- **EACT** — 31 questoes, 3 dimensoes (Custo Afetivo, Custo Cognitivo, Custo Fisico)
- **ITRA** — 32 questoes, 7 dimensoes
- **QVT-Walton** — 35 questoes, 8 dimensoes
- Scoring por dimensao com normalizacao 0-100
- Graficos por dimensao com classificacao de risco (Bom/Atencao/Risco/Critico)

### Dashboard Psicossocial

- Scores por dimensao COPSOQ com grafico radar
- Segmentacao por setor/departamento/demografia (genero, faixa etaria, escolaridade)
- Tendencias multi-ciclo com deltas de melhoria/piora
- Tabela historica com badges de tendencia
- Compartilhamento de resultados (devolutiva NR-01 §1.5.3.7)

### Integracao PGR/PCMSO (NR-07)

- Recomendacoes medicas ocupacionais baseadas nos riscos identificados
- Registro de resultados de exames ASO (admissional, periodico, retorno, demissional)
- PGR consolidado em PDF
- Campos: tipo de exame, resultado (apto/inapto/restricao), medico, CRM, proximo exame

### eSocial

- Geracao de XML: **S-2210** (CAT), **S-2220** (Monitoramento Saude), **S-2240** (Condicoes Ambientais)
- Validacao de XML (tags obrigatorias, formato)
- Envio via SOAP com certificado A1 (mTLS)
- Auto-deteccao de S-2240 pendentes com alerta visual
- Consulta de status de processamento

### Benchmarks Setoriais

- Comparacao com dados de mercado por setor (Saude, Educacao, Varejo, TI, etc.)
- Taxas de burnout, assedio e afastamentos por saude mental por setor
- Alerta automatico para empresas em setores com burnout >8%
- Grafico radar comparativo (empresa vs. media do setor)

### Geracoes de PDF (20+ tipos)

| Documento | Descricao |
|-----------|-----------|
| Relatorio COPSOQ-II | Scores por dimensao, classificacao, recomendacoes |
| Inventario de Riscos | Matriz completa com fatores MTE |
| Plano de Acao | Acoes, prazos, responsaveis, cronograma |
| GRO Consolidado | 8 secoes NR-01 §1.5 |
| PGR Consolidado | Programa completo de prevencao |
| Integracao PCMSO | Recomendacoes medicas |
| Proposta Comercial | Servicos, valores, ROI |
| Programa de Treinamento | Modulos, carga horaria |
| Checklist de Conformidade | 35 itens com status |
| Certificado NR-01 | Certificacao de conformidade |
| Relatorio eSocial | Eventos gerados/enviados |
| Benchmark Setorial | Comparacao com mercado |
| Tendencias COPSOQ | Evolucao historica |
| Resumo para Trabalhadores | Devolutiva anonimizada |
| Pesquisa de Clima | Resultados EACT/ITRA/QVT |

### Calculadora de Risco Financeiro

- Custo de nao-conformidade (multas, litigacao, absenteismo)
- ROI estimado da implementacao
- Parametros configuraveis (salario medio, headcount, custos)

### Suporte IA

- Chatbot inteligente com LLM (Anthropic Claude / OpenAI)
- Base de conhecimento com 12 topicos
- Contexto conversacional (historico de mensagens)
- Abertura automatica de tickets de suporte

### Modulo de Precificacao

- Catalogo de servicos personalizavel
- Calculo de hora tecnica (4 regimes tributarios: MEI, SN, LP, Autonomo)
- Geracao de propostas comerciais com descontos progressivos
- Integracao avaliacao → proposta automatica

### Modulo de Monetizacao

- Planos Starter, Professional, Enterprise
- Controle de limites por plano
- Gateway Asaas (PIX, cartao, boleto)
- Periodo de teste gratuito
- Metricas de uso por tenant

### Funcionalidades Transversais

- **Autenticacao** — bcrypt-12, HMAC-signed session cookies, 2FA (TOTP)
- **Multi-Tenant** — Isolamento completo por empresa (Row-Level Security)
- **RBAC** — 4 roles, 20 permissoes, permittedProcedure("resource","action")
- **Denuncias Anonimas** — Canal de escuta confidencial
- **Treinamentos** — Modulos com progresso por colaborador
- **Auditoria** — Log completo de acoes
- **DSR/LGPD** — Exportacao de dados pessoais

---

## Arquitetura

### Stack Tecnologico

**Frontend:** React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts + React Router DOM + TanStack Query

**Backend:** Express 4 + tRPC 11 + Drizzle ORM + Zod + SuperJSON

**IA:** Anthropic Claude / OpenAI via invokeLLM + Prompts especializados (agent-system, copsoq-analysis, risk-inventory, gro-document, action-plan)

**Database:** MySQL 8.0 — 85 tabelas em 3 schemas (schema.ts, schema_nr01.ts, schema_agent.ts)

**DevOps:** Docker + Nginx + Let's Encrypt + GitHub Actions + DigitalOcean

### Diagrama

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                         │
│  78 paginas | shadcn/ui | Recharts | React Router DOM           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ tRPC (type-safe)
┌───────────────────────────▼─────────────────────────────────────┐
│                  BACKEND (Express + tRPC)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ 47 Routers   │  │  _ai/ Module │  │  PDF Generation  │      │
│  │ (NR-01, eSoc │  │  (SamurAI,   │  │  (20+ types)     │      │
│  │  PCMSO, etc) │  │   LLM, NLP)  │  │                  │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Drizzle ORM
┌───────────────────────────▼─────────────────────────────────────┐
│              DATABASE (MySQL 8.0 — 85 tabelas)                  │
│  schema.ts (47) | schema_nr01.ts (34) | schema_agent.ts (4)     │
└─────────────────────────────────────────────────────────────────┘
```

### Modelo de Dados (principais)

**Core:** users, roles, permissions, role_permissions, tenants, sectors, people

**NR-01:** risk_categories, risk_factors, risk_assessments, risk_assessment_items, action_plans, copsoq_assessments, copsoq_responses, copsoq_reports, copsoq_invites, compliance_checklist, compliance_documents, compliance_certificates, pcmso_recommendations, pcmso_exam_results, benchmark_data, esocial_exports, result_disseminations

**Agent:** agent_conversations, agent_messages, agent_alerts, agent_actions

**Precificacao:** clients, services, pricing_parameters, proposals, proposal_items

---

## Quick Start

### Pre-requisitos

- Node.js 22.13.0+
- pnpm 9.0+
- MySQL 8.0+

### Instalacao

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# Docker (recomendado)
./setup-docker.sh

# Ou manual
pnpm install
cp .env.example .env    # Edite com suas credenciais
pnpm db:push
pnpm dev
```

Acesse `http://localhost:3000`

### Variaveis de Ambiente

```env
DATABASE_URL=mysql://user:password@localhost:3306/blackbelt
SESSION_SECRET=your_session_secret
ANTHROPIC_API_KEY=sk-ant-...    # Para SamurAI
BREVO_SMTP_KEY=...              # Para emails
ASAAS_API_KEY=...               # Para pagamentos
```

---

## Documentacao

| Arquivo | Descricao |
|---------|-----------|
| [COMO_RODAR.md](COMO_RODAR.md) | Guia pratico de setup |
| [USER_GUIDE.md](USER_GUIDE.md) | Guia do usuario |
| [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | Guia do desenvolvedor |
| [API_DOCUMENTATION.md](API_DOCUMENTATION.md) | Documentacao da API tRPC |
| [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md) | Documentacao tecnica completa |
| [REQUISITOS_NR01.md](REQUISITOS_NR01.md) | Requisitos de conformidade NR-01 |
| [PRICING.md](PRICING.md) | Planos e precos |
| [TESTING.md](TESTING.md) | Guia de testes |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Guia de deploy |

---

## Roadmap

### Concluido

- [x] Gestao de Riscos NR-01 com 5 categorias GRO + 13 tipos MTE
- [x] COPSOQ-II (76q, 12 dimensoes, reverse scoring)
- [x] SamurAI — Agente IA com 10 fases + auto-transicao
- [x] 20+ documentos PDF (GRO, PGR, COPSOQ, inventario, etc.)
- [x] Dashboard psicossocial com segmentacao e tendencias
- [x] Pesquisas de clima (EACT, ITRA, QVT-Walton)
- [x] Integracao eSocial (S-2210, S-2220, S-2240)
- [x] Integracao PGR/PCMSO com exames ASO
- [x] Benchmarks setoriais (burnout, assedio, afastamentos)
- [x] Checklist de conformidade (35 itens, 5 NRs)
- [x] Planos de acao com verificacao de eficacia
- [x] Suporte IA com LLM
- [x] Gateway Asaas (PIX, cartao, boleto)
- [x] Multi-tenant com RBAC + 2FA
- [x] Calculadora de risco financeiro

### Futuro

- [ ] Testes E2E com Playwright
- [ ] Internacionalizacao (i18n)
- [ ] Notificacoes push (prazos, alertas)
- [ ] Relatorio executivo one-pager
- [ ] Integracao com calendario (Google/Outlook)
- [ ] Mobile App (React Native)
- [ ] API publica REST
- [ ] White-label (Enterprise)

---

## Comandos

```bash
pnpm dev          # Servidor de desenvolvimento
pnpm build        # Build para producao
pnpm start        # Servidor de producao
pnpm db:push      # Aplicar schema ao banco
pnpm test         # Executar testes
pnpm lint         # Linting
pnpm type-check   # Verificacao de tipos
```

---

## Autores

- **Carlos Honorato** — Fundador, 20 anos PRF/Exercito, Faixa Preta 4o grau
- **Thybere Mendes** — Co-fundador, Gestao Agil, Alta Performance

## Contato

- **Website:** [blackbeltconsultoria.com](https://blackbeltconsultoria.com)
- **Email:** contato@blackbeltconsultoria.com
- **GitHub:** [CarlosHonorato70](https://github.com/CarlosHonorato70)

---

**Desenvolvido pela Black Belt Consultoria**

**Ultima atualizacao:** Abril 2026
**Versao:** 2.0.0
**Status:** Production Ready
