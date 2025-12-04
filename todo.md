# Black Belt Platform Unificada - TODO

## ✅ Funcionalidades Existentes (Plataforma 1: Gestão de Riscos)

- [x] Seleção de empresa (tenant) com modal visual
- [x] Página de Empresas (Tenants) com CRUD
- [x] Página de Setores com filtro por empresa
- [x] Página de Colaboradores com filtro por empresa
- [x] Página de Avaliações NR-01 com dropdown de ações
- [x] Integração com logo da Black Belt Consultoria
- [x] Contexto global de seleção de empresa (TenantContext)
- [x] Formulário de Avaliação de Riscos Psicossociais
- [x] Dashboard de Indicadores com gráficos
- [x] Relatórios de Compliance NR-01
- [x] Sistema de Convites de Usuários
- [x] Gestão de Perfis e Permissões (RBAC/ABAC)
- [x] Auditoria Visual (Logs)
- [x] Exportação de Dados (DSR LGPD)
- [x] Notificações em Tempo Real
- [x] Exportação em JSON, Excel e PDF
- [x] Guia interativo para novos usuários
- [x] Dashboard de Testes E2E

---

## 🆕 Fase 1: Preparação e Planejamento (Semana 1)

### Análise e Documentação
- [x] Análise de ambas as plataformas
- [x] Criação do projeto estratégico
- [x] Definição da arquitetura unificada
- [ ] Validação com stakeholders
- [ ] Alocação de recursos

### Setup de Ambiente
- [ ] Backup do projeto atual
- [ ] Criar branch de desenvolvimento
- [ ] Preparar ambiente de testes

---

## 🆕 Fase 2: Atualizar Schema de Banco de Dados (Semana 2)

### Schema Core (Autenticação)
- [ ] Validar tabela users (consolidada)
- [ ] Validar tabela roles (RBAC)
- [ ] Validar tabela permissions (ABAC)

### Schema Multi-Tenant
- [ ] Validar tabela tenants (empresas)
- [ ] Validar tabela sectors (setores)
- [ ] Validar tabela people (colaboradores)

### Schema Conformidade NR-01
- [ ] Validar tabela riskAssessments (avaliações)
- [ ] Validar tabela riskFactors (fatores de risco)
- [ ] Validar tabela complianceReports (relatórios)

### Schema Precificação (NOVO)
- [x] Criar tabela clients (clientes para precificação)
- [x] Criar tabela services (serviços oferecidos)
- [x] Criar tabela pricingParameters (parâmetros de precificação)
- [x] Criar tabela proposals (propostas comerciais)
- [x] Criar tabela proposalItems (itens das propostas)

### Schema Auditoria
- [ ] Validar tabela auditLogs (logs de auditoria)
- [ ] Validar tabela dataConsents (consentimentos LGPD)
- [ ] Validar tabela userInvites (convites de usuários)

### Migrations
- [x] Criar migrations para novo schema
- [x] Testar migrations em desenvolvimento
- [ ] Documentar estratégia de rollback

---

## 🆕 Fase 3: Backend - Módulo de Precificação (Semana 3-4)

### Database Helpers (server/db.ts)
- [x] Helpers para clients (CRUD)
- [x] Helpers para services (CRUD)
- [x] Helpers para pricingParameters (CRUD)
- [x] Helpers para proposals (CRUD)
- [x] Helpers para proposalItems (CRUD)
- [x] Helper para cálculo de hora técnica
- [x] Helper para cálculo de proposta completa

### tRPC Routers (server/routers.ts)
- [x] Router clients (list, create, update, delete)
- [x] Router services (list, create, update, delete)
- [x] Router pricingParameters (get, update)
- [x] Router proposals (list, create, update, delete, getById)
- [x] Router pricing (calculateTechnicalHour, calculateProposal)

### Lógica de Negócio
- [ ] Cálculo de hora técnica (4 regimes tributários)
- [ ] Aplicação de descontos por volume
- [ ] Cálculo de impostos
- [ ] Geração de proposta em PDF
- [ ] Envio de proposta por email

### Validações
- [ ] Validação de clientes
- [ ] Validação de serviços
- [ ] Validação de parâmetros de precificação
- [ ] Validação de cálculos

---

## 🆕 Fase 4: Backend - Módulo de Gestão Integrada (Semana 4-5)

### Integração Conformidade + Precificação
- [ ] Helper para recomendação de serviços baseada em risco
- [ ] Helper para vincular avaliação → proposta
- [ ] Helper para histórico de propostas por cliente
- [ ] Helper para análise de rentabilidade

### Consolidação de Routers
- [ ] Consolidar auth.* routers
- [ ] Consolidar rolesPermissions.* routers
- [ ] Consolidar auditLogs.* routers
- [ ] Consolidar dataExport.* routers
- [ ] Consolidar tenants.* routers
- [ ] Consolidar sectors.* routers
- [ ] Consolidar people.* routers

### Serviços Transversais
- [ ] Integração com S3 (storage)
- [ ] Notificações em tempo real
- [ ] Integração com LLM (análises)
- [ ] Integração com geração de imagens

### Testes Backend
- [ ] Testes unitários para cálculos
- [ ] Testes de integração para fluxos
- [ ] Testes de validação

---

## 🆕 Fase 5: Frontend - Páginas de Precificação (Semana 5-6)

### Página de Clientes
- [ ] Criar client/src/pages/Clients.tsx
- [ ] Listar clientes com tabela
- [ ] Criar novo cliente (modal/form)
- [ ] Editar cliente
- [ ] Deletar cliente
- [ ] Exportar lista de clientes

### Página de Serviços
- [ ] Criar client/src/pages/Services.tsx
- [ ] Listar serviços com tabela
- [ ] Criar novo serviço (modal/form)
- [ ] Editar serviço
- [ ] Deletar serviço
- [ ] Exportar lista de serviços

### Página de Parâmetros de Precificação
- [ ] Criar client/src/pages/PricingParameters.tsx
- [ ] Formulário para configurar parâmetros
- [ ] Campos: custo fixo, custo MO, horas produtivas, descontos, ajustes
- [ ] Suporte a múltiplos regimes tributários
- [ ] Salvar e atualizar parâmetros

### Página de Propostas (Compositor)
- [ ] Criar client/src/pages/Proposals.tsx
- [ ] Seletor de cliente
- [ ] Seletor de regime tributário
- [ ] Tabela de itens da proposta
- [ ] Adicionar serviços à proposta
- [ ] Cálculos em tempo real
- [ ] Visualização de proposta
- [ ] Gerar PDF
- [ ] Enviar por email

### Componentes Reutilizáveis
- [ ] ClientSelector component
- [ ] ServiceSelector component
- [ ] ProposalPreview component
- [ ] PricingCalculator component

### Testes Frontend
- [ ] Testes de renderização
- [ ] Testes de interação
- [ ] Testes de cálculos

---

## 🆕 Fase 6: Frontend - Dashboard Unificado (Semana 6-7)

### Dashboard Principal
- [ ] Atualizar Home.tsx com novo layout
- [ ] Seletor de empresa (tenant)
- [ ] KPIs consolidados:
  - [ ] Empresas atendidas
  - [ ] Colaboradores
  - [ ] Avaliações NR-01 pendentes
  - [ ] Propostas em andamento
  - [ ] Receita do mês
  - [ ] Taxa de aceitação de propostas

### Widgets de Dashboard
- [ ] Widget de conformidade NR-01
- [ ] Widget de propostas recentes
- [ ] Widget de clientes principais
- [ ] Widget de receita por serviço
- [ ] Widget de status de avaliações

### Atualização do Menu Lateral
- [ ] Reorganizar menu para incluir precificação
- [ ] Adicionar seção "Conformidade"
- [ ] Adicionar seção "Precificação"
- [ ] Adicionar seção "Gestão"
- [ ] Adicionar seção "Análise"

### Páginas de Análise e Relatórios
- [ ] Criar ComplianceDashboard.tsx
- [ ] Criar PricingDashboard.tsx
- [ ] Criar AuditDashboard.tsx
- [ ] Gráficos de conformidade
- [ ] Gráficos de receita
- [ ] Gráficos de auditoria

---

## 🆕 Fase 7: Integrar Fluxos de Negócio (Semana 7-8)

### Fluxo 1: Avaliação → Proposta
- [ ] Adicionar botão "Gerar Proposta" em avaliação
- [ ] Pré-popular proposta com dados da avaliação
- [ ] Recomendar serviços baseado em risco
- [ ] Criar proposta automaticamente

### Fluxo 2: Gestão de Múltiplos Clientes
- [ ] Implementar seletor de empresa no dashboard
- [ ] Filtrar dados por empresa selecionada
- [ ] Atualizar contexto de tenant
- [ ] Persistir seleção em localStorage

### Fluxo 3: Histórico Integrado
- [ ] Visualizar histórico de avaliações por cliente
- [ ] Visualizar histórico de propostas por cliente
- [ ] Comparar avaliações ao longo do tempo
- [ ] Análise de evolução de risco

### Fluxo 4: Recomendações Inteligentes
- [ ] Recomendar serviços baseado em risco
- [ ] Sugerir descontos por volume
- [ ] Alertar sobre conformidade vencida
- [ ] Notificar sobre propostas expiradas

### Integração de Dados
- [ ] Vincular clientes de precificação com empresas
- [ ] Vincular avaliações com propostas
- [ ] Histórico de propostas por avaliação
- [ ] Análise de rentabilidade por cliente

---

## 🆕 Fase 8: Testes E2E e Validação (Semana 8-9)

### Testes de Precificação
- [ ] TC-022: Criar cliente
- [ ] TC-023: Criar serviço
- [ ] TC-024: Configurar parâmetros de precificação
- [ ] TC-025: Criar proposta simples
- [ ] TC-026: Criar proposta com múltiplos itens
- [ ] TC-027: Aplicar desconto por volume
- [ ] TC-028: Gerar PDF de proposta
- [ ] TC-029: Enviar proposta por email
- [ ] TC-030: Aceitar/rejeitar proposta

### Testes de Integração
- [ ] TC-031: Fluxo completo avaliação → proposta
- [ ] TC-032: Recomendação de serviços
- [ ] TC-033: Histórico de propostas
- [ ] TC-034: Análise de rentabilidade
- [ ] TC-035: Múltiplas empresas

### Testes de Cálculo
- [ ] TC-036: Cálculo de hora técnica (MEI)
- [ ] TC-037: Cálculo de hora técnica (SN)
- [ ] TC-038: Cálculo de hora técnica (LP)
- [ ] TC-039: Cálculo de hora técnica (Autônomo)
- [ ] TC-040: Aplicação de descontos
- [ ] TC-041: Cálculo de impostos
- [ ] TC-042: Validação de totais

### Testes de Performance
- [ ] Tempo de cálculo de proposta < 500ms
- [ ] Carregamento de lista de propostas < 1s
- [ ] Geração de PDF < 2s

### Testes de Segurança
- [ ] Isolamento de dados por tenant
- [ ] Validação de permissões
- [ ] Proteção contra SQL injection
- [ ] Validação de entrada

### Dashboard de Testes
- [ ] Atualizar TestDashboard com novos testes
- [ ] Adicionar métricas de precificação
- [ ] Adicionar métricas de integração

---

## 🆕 Fase 9: Documentação e Deploy (Semana 9-10)

### Documentação
- [ ] Atualizar README.md
- [ ] Documentar novas APIs (tRPC)
- [ ] Criar guia de usuário para precificação
- [ ] Criar guia de administrador
- [ ] Documentar fluxos de negócio
- [ ] Criar diagrama de arquitetura
- [ ] Documentar schema de banco de dados

### Preparação para Produção
- [ ] Configurar variáveis de ambiente
- [ ] Preparar migrations para produção
- [ ] Configurar backup de banco de dados
- [ ] Preparar plano de rollback
- [ ] Testar em staging

### Deployment
- [ ] Deploy em staging
- [ ] Testes de carga
- [ ] Validação de conformidade
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy

### Treinamento e Suporte
- [ ] Treinar equipe de consultores
- [ ] Treinar equipe administrativa
- [ ] Criar documentação de suporte
- [ ] Estabelecer SLA

---

## 📊 Resumo de Progresso

**Total de Tarefas:** 150+  
**Concluídas:** 18  
**Em Progresso:** 0  
**Pendentes:** 132+

**Fases:**
1. Preparação: 2/5 ✓
2. Schema: 0/13 ✗
3. Backend Precificação: 0/18 ✗
4. Backend Integração: 0/17 ✗
5. Frontend Precificação: 0/20 ✗
6. Frontend Dashboard: 0/16 ✗
7. Fluxos de Negócio: 0/10 ✗
8. Testes E2E: 0/25 ✗
9. Documentação: 0/16 ✗

---

## 📝 Notas Importantes

- Manter compatibilidade com plataforma atual durante migração
- Testar cada fase antes de prosseguir para próxima
- Documentar decisões de arquitetura
- Comunicar progresso aos stakeholders
- Preparar plano de rollback para cada fase


---

## ✨ Sistema de Lembretes Automáticos (NOVO)

### Backend
- [x] Criar tabela copsoqReminders no schema
- [x] Implementar routers tRPC para reminders
- [x] Criar agendador de lembretes (reminder-scheduler.ts)
- [x] Integrar agendador ao servidor (startReminderScheduler)
- [x] Implementar lógica de envio de emails de lembrete
- [x] Configurar intervalo de lembretes (2, 5, 9 dias)
- [x] Implementar limite máximo de 3 lembretes por convite
- [x] Implementar expiração de convites após 14 dias
- [x] Adicionar tratamento de erros e logging

### Frontend
- [x] Criar página ReminderManagement.tsx
- [x] Implementar seleção de avaliação
- [x] Exibir estatísticas de lembretes
- [x] Listar histórico de lembretes enviados
- [x] Botão para executar agendador manualmente
- [x] Botão para enviar lembrete manual
- [x] Integrar ao sidebar com ícone Bell
- [x] Adicionar rota /reminder-management ao App.tsx
- [x] Exibir status de envio (enviado, falha, rejeitado)

### Configuração
- [x] Agendador executa a cada 1 hora
- [x] 1º lembrete: 2 dias após envio
- [x] 2º lembrete: 5 dias após envio
- [x] 3º lembrete: 9 dias após envio
- [x] Máximo 3 lembretes por convite
- [x] Convites expiram após 14 dias

### Testes
- [ ] Teste unitário para cálculo de datas de lembrete
- [ ] Teste unitário para verificação de limite de lembretes
- [ ] Teste de integração para envio de email
- [ ] Teste E2E para fluxo completo de lembretes


## 🔔 Cancelamento de Convites (NOVO)

### Backend
- [x] Adicionar rota tRPC para cancelar convite
- [x] Implementar lógica para marcar convite como cancelado
- [x] Validar permissões antes de cancelar
- [x] Registrar log de cancelamento

### Frontend
- [x] Adicionar botão de cancelamento na tabela de histórico
- [x] Implementar dialog de confirmação
- [x] Atualizar status visual do convite cancelado
- [x] Mostrar mensagem de sucesso/erro


## 🔐 Autenticação Local Independente (NOVO)

- [x] Remover dependências do OAuth Manus do contexto
- [x] Criar router tRPC de autenticação local simples
- [x] Implementar login/registro com email e senha
- [x] Adicionar suporte a sessões JWT simples
- [x] Testar registro de usuário
- [x] Testar login de usuário
- [x] Testar logout
- [x] Testar acesso às funcionalidades após login
- [x] Validar todas as funcionalidades sem Manus

## 💰 Sistema de Precificação (EM DESENVOLVIMENTO)

### Fase 1: Gerenciamento de Serviços
- [x] Criar página de listagem de serviços
- [x] Implementar formulário de criação de serviço
- [x] Implementar formulário de edição de serviço
- [x] Implementar botão de exclusão de serviço
- [x] Adicionar validações de preço (mínimo < máximo)

### Fase 2: Gerenciamento de Clientes
- [x] Criar página de listagem de clientes
- [x] Implementar formulário de criação de cliente
- [x] Implementar formulário de edição de cliente
- [x] Implementar botão de exclusão de cliente

### Fase 3: Parâmetros de Precificação
- [x] Criar página de configuração de parâmetros
- [x] Implementar campos de custo mensal e horas produtivas
- [x] Implementar seleção de regime tributário
- [x] Implementar ajustes de risco e senioridade

### Fase 4: Criação de Propostas
- [x] Criar página de criação de propostas
- [x] Implementar seleção de cliente e serviços
- [x] Implementar cálculo automático de preço
- [x] Implementar geração de PDF da proposta

### Fase 5: Integração
- [x] Adicionar menu de precificação ao sidebar
- [x] Adicionar rotas ao App.tsx
- [x] Testar fluxo completo
