# 📋 Issues do GitHub - Black Belt Platform

**Repositório:** https://github.com/CarlosHonorato70/blackbelt-platform  
**Total de Issues:** 27  
**Status:** Todas abertas (open)  
**Data de Criação:** Novembro 2025

---

## 📊 Resumo por Categoria

### 🏥 Módulo de Conformidade NR-01 (6 issues)

| #   | Título                                    | Status |
| --- | ----------------------------------------- | ------ |
| #1  | feat: Avaliações de Riscos Psicossociais  | Open   |
| #2  | feat: Matriz de Probabilidade × Gravidade | Open   |
| #3  | feat: Planos de Ação                      | Open   |
| #4  | feat: Relatórios de Compliance            | Open   |
| #5  | feat: Auditoria Completa                  | Open   |
| #6  | feat: Exportação LGPD                     | Open   |

**Descrição:** Funcionalidades para conformidade com Portaria MTE nº 1.419/2024, incluindo avaliações, cálculos de risco, planos de ação e relatórios.

---

### 💰 Módulo de Precificação (6 issues)

| #   | Título                                | Status |
| --- | ------------------------------------- | ------ |
| #7  | feat: Gestão de Clientes              | Open   |
| #8  | feat: Catálogo de Serviços            | Open   |
| #9  | feat: Parâmetros de Precificação      | Open   |
| #10 | feat: Cálculo de Hora Técnica         | Open   |
| #11 | feat: Geração de Propostas            | Open   |
| #12 | feat: Integração Avaliação → Proposta | Open   |

**Descrição:** Sistema completo de precificação com gestão de clientes, serviços, cálculos tributários e geração de propostas.

---

### 🔐 Funcionalidades Transversais (8 issues)

| #   | Título                           | Status |
| --- | -------------------------------- | ------ |
| #13 | feat: Autenticação OAuth 2.0     | Open   |
| #14 | feat: Multi-Tenant               | Open   |
| #15 | feat: RBAC + ABAC                | Open   |
| #16 | feat: Convites de Usuários       | Open   |
| #17 | feat: Perfis e Permissões        | Open   |
| #18 | feat: Dashboard em Tempo Real    | Open   |
| #19 | feat: Guia Interativo            | Open   |
| #20 | feat: Notificações em Tempo Real | Open   |

**Descrição:** Funcionalidades de segurança, acesso, gestão de usuários e experiência do usuário.

---

### 🚀 Roadmap - Fase 2 (7 issues)

| #   | Título                                      | Status |
| --- | ------------------------------------------- | ------ |
| #21 | feat: Dashboard de Testes E2E Avançado      | Open   |
| #22 | feat: Exportação de Propostas em PDF        | Open   |
| #23 | feat: Integração com CRM                    | Open   |
| #24 | feat: API Pública REST                      | Open   |
| #25 | feat: Webhooks                              | Open   |
| #26 | feat: Analytics Avançado                    | Open   |
| #27 | feat: Machine Learning - Previsão de Riscos | Open   |

**Descrição:** Funcionalidades planejadas para futuras versões, incluindo integrações, APIs e machine learning.

---

## 📝 Detalhes de Cada Issue

### Issue #1: Avaliações de Riscos Psicossociais

**Título:** feat: Avaliações de Riscos Psicossociais

**Descrição:**
Implementar formulário completo com 30+ fatores de risco para avaliações NR-01 conforme Portaria MTE nº 1.419/2024. Incluir validação, cálculo automático de níveis e exportação de dados.

**Tarefas Sugeridas:**

- [ ] Criar formulário com 30+ campos de fatores de risco
- [ ] Implementar validação de entrada
- [ ] Adicionar cálculo automático de níveis
- [ ] Implementar exportação de dados
- [ ] Criar testes E2E

---

### Issue #2: Matriz de Probabilidade × Gravidade

**Título:** feat: Matriz de Probabilidade × Gravidade

**Descrição:**
Cálculo automático de níveis de risco baseado em probabilidade e gravidade. Implementar matriz 5x5 com cores visuais e recomendações automáticas de ações.

**Tarefas Sugeridas:**

- [ ] Criar matriz 5x5 visual
- [ ] Implementar cálculo de risco
- [ ] Adicionar cores por nível
- [ ] Gerar recomendações automáticas
- [ ] Criar testes

---

### Issue #3: Planos de Ação

**Título:** feat: Planos de Ação

**Descrição:**
Sistema de rastreamento de ações corretivas com status, prazos, responsáveis e evidências. Incluir notificações de vencimento e relatórios de progresso.

**Tarefas Sugeridas:**

- [ ] Criar CRUD de planos de ação
- [ ] Implementar rastreamento de status
- [ ] Adicionar notificações de vencimento
- [ ] Criar relatórios de progresso
- [ ] Implementar evidências/anexos

---

### Issue #4: Relatórios de Compliance

**Título:** feat: Relatórios de Compliance

**Descrição:**
Geração automática de relatórios de compliance NR-01 em PDF com gráficos, tabelas e recomendações. Incluir assinatura digital e data de geração.

**Tarefas Sugeridas:**

- [ ] Criar template de relatório
- [ ] Implementar geração de PDF
- [ ] Adicionar gráficos e tabelas
- [ ] Incluir assinatura digital
- [ ] Testar exportação

---

### Issue #5: Auditoria Completa

**Título:** feat: Auditoria Completa

**Descrição:**
Log de todas as ações do sistema com rastreabilidade completa. Incluir usuário, timestamp, IP, ação, valores antigos/novos e contexto.

**Tarefas Sugeridas:**

- [ ] Criar tabela de auditoria
- [ ] Implementar logging middleware
- [ ] Adicionar rastreamento de mudanças
- [ ] Criar dashboard de auditoria
- [ ] Implementar retenção de logs

---

### Issue #6: Exportação LGPD

**Título:** feat: Exportação LGPD

**Descrição:**
Implementar Data Subject Requests (DSR) para conformidade LGPD. Permitir exportação de todos os dados pessoais em formato estruturado.

**Tarefas Sugeridas:**

- [ ] Criar endpoint de DSR
- [ ] Implementar coleta de dados pessoais
- [ ] Gerar arquivo estruturado (JSON/CSV)
- [ ] Adicionar autenticação de segurança
- [ ] Testar conformidade LGPD

---

### Issue #7: Gestão de Clientes

**Título:** feat: Gestão de Clientes

**Descrição:**
CRUD completo de clientes para propostas comerciais. Incluir campos de contato, endereço, histórico de propostas e status.

**Tarefas Sugeridas:**

- [ ] Criar formulário de cliente
- [ ] Implementar CRUD (Create, Read, Update, Delete)
- [ ] Adicionar histórico de propostas
- [ ] Implementar busca e filtros
- [ ] Criar testes

---

### Issue #8: Catálogo de Serviços

**Título:** feat: Catálogo de Serviços

**Descrição:**
Gestão de serviços oferecidos com preços base, descrição, duração estimada e categorias. Permitir ativação/desativação de serviços.

**Tarefas Sugeridas:**

- [ ] Criar tabela de serviços
- [ ] Implementar CRUD
- [ ] Adicionar categorias
- [ ] Implementar ativação/desativação
- [ ] Criar interface de gestão

---

### Issue #9: Parâmetros de Precificação

**Título:** feat: Parâmetros de Precificação

**Descrição:**
Configuração de regimes tributários (MEI, SN, LP, Autônomo) com alíquotas e cálculos específicos. Permitir ajustes por tenant.

**Tarefas Sugeridas:**

- [ ] Criar tabela de parâmetros
- [ ] Implementar 4 regimes tributários
- [ ] Adicionar configuração por tenant
- [ ] Criar interface de ajuste
- [ ] Testar cálculos

---

### Issue #10: Cálculo de Hora Técnica

**Título:** feat: Cálculo de Hora Técnica

**Descrição:**
Cálculo automático com 4 regimes tributários diferentes. Incluir margem, impostos, encargos e gerar valor final com precisão.

**Tarefas Sugeridas:**

- [ ] Implementar cálculo para MEI
- [ ] Implementar cálculo para SN
- [ ] Implementar cálculo para LP
- [ ] Implementar cálculo para Autônomo
- [ ] Criar testes de precisão

---

### Issue #11: Geração de Propostas

**Título:** feat: Geração de Propostas

**Descrição:**
Propostas comerciais com descontos, impostos e cálculos automáticos. Incluir versionamento, histórico e rastreamento de aceitação.

**Tarefas Sugeridas:**

- [ ] Criar formulário de proposta
- [ ] Implementar cálculos automáticos
- [ ] Adicionar versionamento
- [ ] Implementar rastreamento
- [ ] Criar testes

---

### Issue #12: Integração Avaliação → Proposta

**Título:** feat: Integração Avaliação → Proposta

**Descrição:**
Recomendação automática de serviços baseada em avaliação NR-01. Pré-popular proposta com dados da avaliação.

**Tarefas Sugeridas:**

- [ ] Criar lógica de recomendação
- [ ] Implementar pré-população de dados
- [ ] Adicionar sugestões de serviços
- [ ] Testar fluxo integrado
- [ ] Criar documentação

---

### Issue #13: Autenticação OAuth 2.0

**Título:** feat: Autenticação OAuth 2.0

**Descrição:**
Integração com Manus OAuth para autenticação segura. Incluir login, logout, refresh token e gestão de sessão.

**Tarefas Sugeridas:**

- [ ] Configurar OAuth 2.0
- [ ] Implementar login
- [ ] Implementar logout
- [ ] Adicionar refresh token
- [ ] Testar segurança

---

### Issue #14: Multi-Tenant

**Título:** feat: Multi-Tenant

**Descrição:**
Isolamento completo de dados por empresa com Row-Level Security (RLS). Garantir que cada tenant veja apenas seus dados.

**Tarefas Sugeridas:**

- [ ] Implementar RLS no banco
- [ ] Adicionar tenantId a todas as tabelas
- [ ] Criar middleware de tenant
- [ ] Testar isolamento
- [ ] Documentar estratégia

---

### Issue #15: RBAC + ABAC

**Título:** feat: RBAC + ABAC

**Descrição:**
Controle de acesso granular com Role-Based (admin, consultant, viewer) e Attribute-Based (tenant, department). Implementar middleware de autorização.

**Tarefas Sugeridas:**

- [ ] Criar tabela de roles
- [ ] Criar tabela de permissions
- [ ] Implementar RBAC
- [ ] Implementar ABAC
- [ ] Testar autorização

---

### Issue #16: Convites de Usuários

**Título:** feat: Convites de Usuários

**Descrição:**
Sistema de onboarding de novos usuários via email. Incluir tokens de convite, expiração e gestão de permissões iniciais.

**Tarefas Sugeridas:**

- [ ] Criar sistema de convites
- [ ] Implementar email de convite
- [ ] Adicionar tokens com expiração
- [ ] Criar página de aceitação
- [ ] Testar fluxo

---

### Issue #17: Perfis e Permissões

**Título:** feat: Perfis e Permissões

**Descrição:**
Gestão de papéis (roles) e permissões granulares. Permitir criar papéis customizados com permissões específicas.

**Tarefas Sugeridas:**

- [ ] Criar interface de gestão
- [ ] Implementar CRUD de roles
- [ ] Adicionar permissões granulares
- [ ] Implementar herança de permissões
- [ ] Testar controle de acesso

---

### Issue #18: Dashboard em Tempo Real

**Título:** feat: Dashboard em Tempo Real

**Descrição:**
Monitoramento de testes E2E com gráficos, métricas e status. Incluir filtros, exportação e alertas de falhas.

**Tarefas Sugeridas:**

- [ ] Criar dashboard visual
- [ ] Implementar gráficos em tempo real
- [ ] Adicionar filtros
- [ ] Implementar alertas
- [ ] Testar performance

---

### Issue #19: Guia Interativo

**Título:** feat: Guia Interativo

**Descrição:**
Tutorial com 12 passos para onboarding de novos usuários. Incluir tooltips, highlights e progresso visual.

**Tarefas Sugeridas:**

- [ ] Criar 12 passos do tutorial
- [ ] Implementar tooltips
- [ ] Adicionar highlights
- [ ] Implementar progresso visual
- [ ] Testar usabilidade

---

### Issue #20: Notificações em Tempo Real

**Título:** feat: Notificações em Tempo Real

**Descrição:**
Sistema de notificações para eventos importantes (propostas, convites, alertas). Incluir email, push e in-app.

**Tarefas Sugeridas:**

- [ ] Criar sistema de notificações
- [ ] Implementar email
- [ ] Implementar push notifications
- [ ] Implementar in-app notifications
- [ ] Testar delivery

---

### Issue #21: Dashboard de Testes E2E Avançado

**Título:** feat: Dashboard de Testes E2E Avançado

**Descrição:**
Expandir dashboard com filtros avançados, histórico de testes e exportação de relatórios em PDF/Excel.

**Tarefas Sugeridas:**

- [ ] Adicionar filtros avançados
- [ ] Implementar histórico
- [ ] Adicionar exportação PDF
- [ ] Adicionar exportação Excel
- [ ] Testar performance

---

### Issue #22: Exportação de Propostas em PDF

**Título:** feat: Exportação de Propostas em PDF

**Descrição:**
Gerar propostas em PDF com logo, formatação profissional, assinatura digital e código QR.

**Tarefas Sugeridas:**

- [ ] Criar template PDF
- [ ] Implementar geração de PDF
- [ ] Adicionar logo
- [ ] Adicionar assinatura digital
- [ ] Testar qualidade

---

### Issue #23: Integração com CRM

**Título:** feat: Integração com CRM

**Descrição:**
Sincronizar dados com sistemas CRM populares (Salesforce, HubSpot, Pipedrive). Bidirecional com webhooks.

**Tarefas Sugeridas:**

- [ ] Integrar Salesforce
- [ ] Integrar HubSpot
- [ ] Integrar Pipedrive
- [ ] Implementar webhooks
- [ ] Testar sincronização

---

### Issue #24: API Pública REST

**Título:** feat: API Pública REST

**Descrição:**
Expor endpoints REST para integração externa. Incluir autenticação, rate limiting e documentação OpenAPI.

**Tarefas Sugeridas:**

- [ ] Criar endpoints REST
- [ ] Implementar autenticação
- [ ] Adicionar rate limiting
- [ ] Criar documentação OpenAPI
- [ ] Testar segurança

---

### Issue #25: Webhooks

**Título:** feat: Webhooks

**Descrição:**
Implementar webhooks para eventos do sistema (proposta criada, avaliação concluída, etc). Permitir retry automático.

**Tarefas Sugeridas:**

- [ ] Criar sistema de webhooks
- [ ] Implementar eventos
- [ ] Adicionar retry automático
- [ ] Criar interface de gestão
- [ ] Testar delivery

---

### Issue #26: Analytics Avançado

**Título:** feat: Analytics Avançado

**Descrição:**
Dashboard com métricas e KPIs detalhados (conversão, valor médio, tempo médio). Incluir previsões e tendências.

**Tarefas Sugeridas:**

- [ ] Criar dashboard de analytics
- [ ] Implementar cálculo de KPIs
- [ ] Adicionar gráficos de tendências
- [ ] Implementar previsões
- [ ] Testar precisão

---

### Issue #27: Machine Learning - Previsão de Riscos

**Título:** feat: Machine Learning - Previsão de Riscos

**Descrição:**
Usar ML para prever riscos baseado em histórico de avaliações. Incluir recomendações automáticas.

**Tarefas Sugeridas:**

- [ ] Coletar dados de treinamento
- [ ] Treinar modelo ML
- [ ] Implementar previsões
- [ ] Adicionar recomendações
- [ ] Testar acurácia

---

## 🔗 Links Úteis

- **Repositório:** https://github.com/CarlosHonorato70/blackbelt-platform
- **Issues:** https://github.com/CarlosHonorato70/blackbelt-platform/issues
- **Pull Requests:** https://github.com/CarlosHonorato70/blackbelt-platform/pulls
- **Projetos:** https://github.com/CarlosHonorato70/blackbelt-platform/projects

---

## 📊 Estatísticas

| Métrica              | Valor         |
| -------------------- | ------------- |
| Total de Issues      | 27            |
| Issues Abertas       | 27            |
| Issues Fechadas      | 0             |
| Issues por Categoria | 6-8           |
| Média de Descrição   | 150+ palavras |

---

## 🎯 Próximos Passos

1. **Triagem:** Revisar e priorizar issues
2. **Estimativa:** Adicionar story points
3. **Atribuição:** Atribuir a desenvolvedores
4. **Milestone:** Agrupar em milestones
5. **Labels:** Adicionar labels (bug, feature, documentation)
6. **Discussão:** Abrir discussões para issues complexas

---

**Última atualização:** Novembro 2025  
**Status:** Todas as issues criadas com sucesso ✅
