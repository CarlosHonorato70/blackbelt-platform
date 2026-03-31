# ROTEIRO DE TESTE COMPLETO — BlackBelt Platform

**Data:** Março 2026
**Ambiente:** https://blackbeltconsultoria.com (produção) ou http://localhost:5000 (dev)
**Objetivo:** Validar todas as funcionalidades por nível de acesso

---

## LEGENDA

- [ ] = Pendente
- [x] = Passou
- [!] = Falhou (anotar observação)
- N/A = Não se aplica

---

## FASE 0 — ACESSO PÚBLICO (Sem login)

### 0.1 Landing Page
- [ ] Acessar `/` — landing page carrega com hero, features, planos e footer
- [ ] Seção "Planos" mostra Starter (R$99), Pro (R$399), Enterprise (Sob consulta)
- [ ] Botão "Começar Grátis" redireciona para `/register`
- [ ] Botão "Entrar" redireciona para `/login`

### 0.2 Páginas Institucionais
- [ ] Acessar `/terms` — Termos de Uso carregam
- [ ] Acessar `/privacy` — Política de Privacidade carrega
- [ ] Acessar `/lgpd` — Informações LGPD carregam

### 0.3 Registro de Novo Usuário
- [ ] Acessar `/register`
- [ ] Preencher: nome, email, senha (mín 8 chars), confirmar senha
- [ ] Submeter → conta criada, redirecionado ao dashboard ou página de verificação
- [ ] Email de verificação recebido (checar caixa de entrada e spam)
- [ ] Clicar link de verificação → email confirmado

### 0.4 Login
- [ ] Acessar `/login`
- [ ] Login com credenciais válidas → redirecionado ao `/dashboard`
- [ ] Login com credenciais inválidas → mensagem de erro
- [ ] Link "Recuperar Senha" visível

### 0.5 Recuperação de Senha
- [ ] Acessar `/forgot-password`
- [ ] Inserir email cadastrado → mensagem "Email Enviado"
- [ ] Email de recuperação recebido (verificar inbox e spam)
- [ ] Link no email aponta para `https://blackbeltconsultoria.com/reset-password/...` (NÃO localhost)
- [ ] Clicar link → página de nova senha carrega
- [ ] Definir nova senha → sucesso, conseguir logar com nova senha
- [ ] Tentar usar mesmo link novamente → erro "link já utilizado"

### 0.6 Cookie Consent
- [ ] Banner de cookies aparece na primeira visita
- [ ] Botão "Apenas Essenciais" funciona
- [ ] Botão "Aceitar Todos" funciona
- [ ] Banner não reaparece após escolha

---

## FASE 1 — ADMIN MASTER

**Credenciais:** ricardo@consultoriasst.com.br / [senha atual]

### 1.1 Login e Dashboard
- [ ] Login bem-sucedido
- [ ] Dashboard admin carrega com métricas resumidas
- [ ] Menu lateral exibe TODAS as seções (Geral, Avaliações, COPSOQ-II, Indicadores, Conformidade, Pessoas, Comercial, Integrações, Administração, Suporte)

### 1.2 Painel Admin — Métricas (`/admin/metrics`)
- [ ] Página carrega sem erros
- [ ] Exibe MRR (Monthly Recurring Revenue)
- [ ] Exibe total de tenants, usuários, assinaturas ativas
- [ ] Lista de tenants com busca funcional
- [ ] Lista de alertas do sistema

### 1.3 Gestão de Tenants (`/tenants`)
- [ ] Lista todos os tenants (consultorias e empresas)
- [ ] Filtrar por tipo (consultant/company)
- [ ] Criar novo tenant do tipo "consultant"
  - Nome: "Consultoria Teste Manual"
  - Tipo: consultant
  - [ ] Tenant criado com sucesso
- [ ] Editar tenant recém-criado (alterar nome)
- [ ] Visualizar detalhes do tenant
- [ ] Suspender tenant → status muda
- [ ] Reativar tenant → status volta a "active"

### 1.4 Gestão de Assinaturas Admin (`/admin/subscriptions`)
- [ ] Página carrega com lista de tenants e suas assinaturas
- [ ] Selecionar um tenant → ver detalhes da assinatura
- [ ] Ativar plano para tenant (ex: Starter)
- [ ] Estender trial (+7 dias) → data de trial atualizada
- [ ] Aplicar desconto (ex: 10%) → preço atualizado
- [ ] Forçar troca de plano (Starter → Pro) → plano atualizado

### 1.5 Convites de Usuários (`/user-invites`)
- [ ] Listar convites existentes
- [ ] Criar novo convite para qualquer tenant
  - Email: teste.admin.invite@example.com
  - Role: consultant
  - Tenant: selecionar um tenant existente
  - [ ] Convite criado, link gerado
- [ ] Copiar link do convite
- [ ] Cancelar convite → status muda para "cancelled"
- [ ] Reenviar convite → novo token gerado
- [ ] Deletar convite → removido da lista

### 1.6 Perfis e Permissões (`/roles-permissions`)
- [ ] Listar roles existentes (admin, consultant, manager, company_admin, analyst, viewer)
- [ ] Ver permissões de cada role
- [ ] Criar nova role "auditor" com permissões selecionadas
- [ ] Atribuir/revogar permissões da role
- [ ] Deletar role criada para teste

### 1.7 Auditoria (`/audit-logs`)
- [ ] Lista de logs carrega
- [ ] Filtrar por tipo de ação (CREATE, UPDATE, DELETE)
- [ ] Filtrar por tipo de entidade
- [ ] Filtrar por data
- [ ] Filtrar por tenant
- [ ] Ver detalhes de um log (valores antigos/novos)

### 1.8 Segurança (`/security-dashboard`)
- [ ] Página carrega
- [ ] Configurações de 2FA visíveis
- [ ] Ativar 2FA → QR code exibido
- [ ] Escanear QR code com app autenticador
- [ ] Inserir código TOTP → 2FA ativado
- [ ] Backup codes exibidos (8 códigos)
- [ ] Fazer logout e login novamente → pedido de código 2FA
- [ ] Inserir código correto → acesso liberado
- [ ] (Opcional) Desativar 2FA para continuar testes

### 1.9 Identidade Visual (`/branding-settings`)
- [ ] Página carrega com configurações de branding
- [ ] Alterar cor primária
- [ ] Upload de logo (se suportado)
- [ ] Configurar domínio customizado (se aplicável)

### 1.10 Suporte Admin (`/admin/support`)
- [ ] Lista todos os tickets de todas as consultorias
- [ ] Filtrar por status (open, in_progress, resolved, closed)
- [ ] Abrir um ticket → ver detalhes e mensagens
- [ ] Responder ticket como admin (mensagem interna ou externa)
- [ ] Alterar status do ticket
- [ ] Ver estatísticas de tickets

### 1.11 LGPD / DSR (`/admin/dsr` ou `/data-export`)
- [ ] Lista de solicitações DSR carrega
- [ ] Criar solicitação de exportação de dados
- [ ] Processar exportação → dados gerados
- [ ] Criar solicitação de exclusão de dados
- [ ] Processar exclusão → dados removidos

### 1.12 Impersonação
- [ ] No painel admin, selecionar um tenant consultor
- [ ] Clicar "Impersonar" → banner de impersonação aparece
- [ ] Navegar pelo dashboard como se fosse o consultor
- [ ] Verificar que vê dados do tenant impersonado
- [ ] Clicar "Sair da impersonação" → voltar à visão admin

### 1.13 Verificação de Isolamento Admin
- [ ] Admin vê TODOS os tenants na lista
- [ ] Admin acessa `/admin/metrics` sem restrição
- [ ] Admin acessa `/audit-logs` sem restrição
- [ ] Admin acessa `/admin/subscriptions` sem restrição

---

## FASE 2 — CONSULTORIA

**Pré-requisito:** Criar conta de consultor ou usar existente
**Credenciais sugeridas:** Criar via `/register` → ativar plano Pro via admin

### 2.1 Registro e Ativação
- [ ] Registrar nova conta (ex: consultoria.teste@example.com)
- [ ] Verificar email
- [ ] Login → Dashboard carrega
- [ ] Sem assinatura → redirecionado para `/subscription/pricing`
- [ ] Selecionar plano (Pro) → iniciar trial de 14 dias
  - (Alternativa: admin ativa plano via `/admin/subscriptions`)
- [ ] Após ativação, dashboard carrega normalmente

### 2.2 Dashboard e Onboarding
- [ ] Dashboard mostra métricas do consultor (0 empresas, 0 avaliações)
- [ ] Menu lateral exibe seções de consultoria (SEM seção Administração)
- [ ] Verificar que `/admin/metrics` redireciona para `/dashboard`
- [ ] Verificar que `/admin/subscriptions` redireciona para `/dashboard`
- [ ] Verificar que `/admin/support` redireciona para `/dashboard`
- [ ] Verificar que `/audit-logs` bloqueia acesso ou redireciona

### 2.3 Gestão de Assinatura (`/subscription`)
- [ ] Dashboard de assinatura mostra plano atual, período, status
- [ ] Visualizar limites do plano (ex: Pro = 10 empresas, 50 users/empresa)
- [ ] Barra de uso mostra progresso (0/10 empresas)

### 2.4 Criar Empresa-Cliente (`/companies`)
- [ ] Acessar `/companies` → lista vazia
- [ ] Clicar "Nova Empresa"
- [ ] Preencher formulário:
  - Nome: "Empresa Teste Manual Ltda"
  - CNPJ: XX.XXX.XXX/0001-XX (CNPJ válido)
  - Endereço, contato (opcionais)
- [ ] Submeter → empresa criada
- [ ] Empresa aparece na lista
- [ ] Verificar que NR-01 checklist (25 itens) foi auto-criado
- [ ] Verificar que cronograma (11 milestones) foi auto-criado

### 2.5 Testar Limite de Empresas
- [ ] Se plano Starter (1 empresa): criar segunda empresa → erro "Limite de 1 empresa(s) atingido"
- [ ] Se plano Pro (10 empresas): criar até o limite → erro aparece na 11ª tentativa
- [ ] Mensagem sugere upgrade

### 2.6 Convidar Usuário para Empresa (`/user-invites`)
- [ ] Acessar `/user-invites`
- [ ] Criar convite:
  - Email: usuario.empresa@example.com
  - Role: company_admin
  - Tenant: selecionar empresa recém-criada
- [ ] Convite criado com link
- [ ] Copiar link do convite
- [ ] Verificar que consultor NÃO pode convidar para tenants de outros consultores

### 2.7 Testar Limite de Usuários
- [ ] Verificar limite do plano (Starter=5, Pro=50)
- [ ] Se atingir limite → erro "Limite de X usuário(s) atingido"

### 2.8 Gestão de Setores (`/sectors`)
- [ ] Selecionar empresa-cliente no contexto
- [ ] Criar setor: "Administrativo"
- [ ] Criar setor: "Operacional"
- [ ] Criar setor: "TI"
- [ ] Editar nome de um setor
- [ ] Verificar que setores são vinculados à empresa correta

### 2.9 Cadastro de Colaboradores (`/people`)
- [ ] Acessar `/people`
- [ ] Adicionar colaborador:
  - Nome: "Maria Silva"
  - Email: maria@empresa.com
  - Setor: Administrativo
- [ ] Adicionar mais 2-3 colaboradores em setores diferentes
- [ ] Editar dados de colaborador
- [ ] Filtrar por setor

### 2.10 Avaliação COPSOQ-II (`/copsoq`)
- [ ] Acessar `/copsoq`
- [ ] Criar nova avaliação:
  - Título: "Avaliação Q1 2026"
  - Empresa: selecionar empresa criada
  - Setor: todos ou específico
- [ ] Avaliação criada com status "draft" ou "active"

### 2.11 Enviar Convites COPSOQ (`/copsoq` → Enviar Convites)
- [ ] Selecionar avaliação criada
- [ ] Enviar convites para os colaboradores cadastrados
- [ ] Verificar que emails foram enviados (ou links gerados)
- [ ] Acessar rastreamento (`/copsoq/tracking`) → convites listados com status "pending"

### 2.12 Responder COPSOQ (Simular como respondente)
- [ ] Copiar link de convite de um colaborador
- [ ] Abrir link em aba anônima (sem login)
- [ ] Página de questionário carrega (76 questões)
- [ ] Responder todas as questões
- [ ] Submeter → confirmação de resposta
- [ ] Voltar ao rastreamento → status muda para "completed"
- [ ] Repetir para pelo menos 3 respondentes

### 2.13 Análise de Resultados
- [ ] Acessar `/copsoq/analytics` → gráficos e scores aparecem
- [ ] 12 dimensões do COPSOQ-II exibidas com scores
- [ ] Cores indicam nível de risco (verde/amarelo/vermelho)
- [ ] Acessar `/psychosocial-dashboard` → indicadores psicossociais
- [ ] Acessar `/risk-matrix` → matriz de risco com plotagem
- [ ] Acessar `/benchmark` → comparação com benchmark setorial
- [ ] Acessar `/assessment-trends` → tendências ao longo do tempo

### 2.14 Planos de Ação (`/action-plans`)
- [ ] Criar plano de ação baseado nos resultados:
  - Título: "Redução de estresse - Setor Operacional"
  - Dimensão: selecionar dimensão de risco alto
  - Ações: adicionar 2-3 ações com prazos e responsáveis
- [ ] Plano salvo e listado
- [ ] Editar plano → atualizar status de ações
- [ ] Marcar ação como concluída

### 2.15 Conformidade NR-01
- [ ] Acessar `/compliance-timeline` → cronograma com 11 milestones
- [ ] Verificar datas calculadas (30, 45, 75... dias a partir da criação)
- [ ] Marcar milestone como concluído
- [ ] Acessar `/compliance-checklist` → 25 requisitos listados
- [ ] Marcar requisito como "compliant"
- [ ] Verificar progresso (%) atualizado
- [ ] Acessar `/compliance-certificate` → certificado disponível quando completo
- [ ] Acessar `/compliance-reports` → relatórios de conformidade

### 2.16 Laudo Técnico (`/laudo-tecnico`)
- [ ] Página carrega com dados da empresa
- [ ] Gerar laudo técnico (PDF)
- [ ] Verificar conteúdo do laudo (dados da avaliação, resultados, recomendações)

### 2.17 Pesquisa de Clima (`/climate-surveys`)
- [ ] Criar pesquisa de clima organizacional
- [ ] Configurar questões
- [ ] Gerar link de resposta
- [ ] Visualizar resultados

### 2.18 Treinamentos (`/training`)
- [ ] Criar programa de treinamento
- [ ] Adicionar módulos
- [ ] Verificar listagem

### 2.19 Canal de Denúncia (`/anonymous-report`)
- [ ] Página de denúncia anônima carrega
- [ ] Submeter denúncia anônima
- [ ] Acessar `/report-management` → denúncia listada
- [ ] Responder/processar denúncia

### 2.20 Avaliação Ergonômica (`/ergonomic-assessments`)
- [ ] Criar avaliação ergonômica (NR-17)
- [ ] Preencher formulário
- [ ] Salvar e visualizar resultado

### 2.21 Módulo Comercial
- [ ] Acessar `/pricing-parameters` → configurar precificação
- [ ] Acessar `/services` → criar serviço
- [ ] Acessar `/clients` → adicionar cliente
- [ ] Acessar `/proposals` → criar proposta comercial
- [ ] Verificar cálculo automático de preço
- [ ] Enviar proposta por email (se habilitado)

### 2.22 Exportações
- [ ] Acessar `/esocial-export` → gerar exportação eSocial
- [ ] Exportar relatório em PDF
- [ ] Exportar dados em Excel

### 2.23 Suporte (`/support`)
- [ ] Criar ticket de suporte:
  - Assunto: "Teste de suporte - Consultoria"
  - Mensagem: descrição do problema
  - Prioridade: medium
- [ ] Ticket criado e listado
- [ ] Adicionar mensagem ao ticket
- [ ] Verificar que ticket aparece no admin (`/admin/support`)

### 2.24 Verificação de Isolamento — Consultoria
- [ ] Consultor NÃO vê tenants de outros consultores
- [ ] Consultor NÃO acessa `/admin/metrics` (redireciona)
- [ ] Consultor NÃO acessa `/admin/subscriptions` (redireciona)
- [ ] Consultor NÃO acessa `/admin/support` (redireciona)
- [ ] Consultor NÃO acessa `/audit-logs` (bloqueado ou redireciona)
- [ ] Consultor vê apenas suas empresas em `/companies`
- [ ] Consultor vê apenas seus dados no dashboard

---

## FASE 3 — EMPRESA (Convidada pela Consultoria)

**Pré-requisito:** Aceitar convite enviado na Fase 2.6
**Credenciais:** usuario.empresa@example.com / [senha definida no aceite]

### 3.1 Aceitar Convite e Criar Conta
- [ ] Acessar link do convite recebido
- [ ] Página de aceite carrega com dados do convite
- [ ] Criar conta (definir nome e senha)
- [ ] Conta criada e vinculada ao tenant da empresa
- [ ] Redirecionado ao login ou dashboard

### 3.2 Login e Dashboard
- [ ] Login com credenciais da empresa
- [ ] Dashboard carrega (herda assinatura da consultoria-pai)
- [ ] Menu lateral exibe APENAS seções permitidas para empresa
- [ ] Verificar que seções de Administração NÃO aparecem
- [ ] Verificar que seção Comercial NÃO aparece

### 3.3 Visualizações Permitidas (Read-Only)
- [ ] Acessar `/sectors` → vê setores da empresa
- [ ] Acessar `/people` → vê colaboradores da empresa
- [ ] Acessar `/copsoq/analytics` → vê análise COPSOQ (se avaliação feita)
- [ ] Acessar `/psychosocial-dashboard` → indicadores psicossociais
- [ ] Acessar `/risk-matrix` → matriz de risco
- [ ] Acessar `/benchmark` → benchmark setorial
- [ ] Acessar `/assessment-trends` → tendências
- [ ] Acessar `/compliance-timeline` → cronograma NR-01
- [ ] Acessar `/compliance-checklist` → checklist de conformidade
- [ ] Acessar `/compliance-certificate` → certificado (se completo)
- [ ] Acessar `/laudo-tecnico` → laudo técnico
- [ ] Acessar `/compliance-reports` → relatórios
- [ ] Acessar `/executive-dashboard` → dashboard executivo
- [ ] Acessar `/climate-surveys` → resultados pesquisa de clima
- [ ] Acessar `/training` → treinamentos disponíveis
- [ ] Acessar `/anonymous-report` → canal de denúncia anônima
- [ ] Acessar `/ergonomic-assessments` → avaliações ergonômicas
- [ ] Acessar `/deadline-alerts` → alertas de prazos

### 3.4 Suporte (`/support`)
- [ ] Empresa pode criar ticket de suporte
- [ ] Empresa pode ver seus próprios tickets
- [ ] Empresa pode adicionar mensagens ao ticket

### 3.5 Restrições — O que a Empresa NÃO Pode Fazer
- [ ] NÃO pode acessar `/admin/metrics` → redireciona para `/dashboard`
- [ ] NÃO pode acessar `/admin/subscriptions` → redireciona
- [ ] NÃO pode acessar `/admin/support` → redireciona
- [ ] NÃO pode acessar `/audit-logs` → erro FORBIDDEN
- [ ] NÃO pode acessar `/companies` → não pode criar empresas
- [ ] NÃO pode acessar `/user-invites` → não pode convidar usuários
- [ ] NÃO pode acessar `/roles-permissions` → redireciona
- [ ] NÃO pode acessar `/branding-settings` → redireciona
- [ ] NÃO pode acessar `/pricing-parameters` → não aparece no menu
- [ ] NÃO pode acessar `/services` → não aparece
- [ ] NÃO pode acessar `/clients` → não aparece
- [ ] NÃO pode acessar `/proposals` → não aparece
- [ ] NÃO pode ver tenants de outros consultores/empresas

### 3.6 Herança de Assinatura
- [ ] Empresa não tem assinatura própria
- [ ] Dashboard mostra status de assinatura herdado da consultoria-pai
- [ ] Se consultoria-pai tem plano ativo → empresa acessa funcionalidades
- [ ] Se consultoria-pai cancela plano → empresa perde acesso

---

## FASE 4 — RESPONDENTE COPSOQ (Usuário Externo)

**Pré-requisito:** Convites COPSOQ enviados na Fase 2.11
**Acesso:** Via link de convite (sem conta na plataforma)

### 4.1 Acesso ao Questionário
- [ ] Acessar link de convite COPSOQ
- [ ] Página carrega sem necessidade de login
- [ ] Nome e título da avaliação exibidos
- [ ] Instruções de preenchimento visíveis

### 4.2 Preenchimento
- [ ] 76 questões exibidas (pode ser paginado)
- [ ] Escala Likert funcional (1-5 ou similar)
- [ ] Navegação entre questões funciona
- [ ] Progresso exibido (ex: "Questão 15 de 76")

### 4.3 Submissão
- [ ] Submeter respostas → confirmação exibida
- [ ] Email de confirmação recebido (se configurado)
- [ ] Tentar acessar link novamente → mensagem "já respondido"

### 4.4 Anonimato
- [ ] Respostas não vinculam identidade ao resultado individual
- [ ] Dados agregados por setor/dimensão (não por pessoa)

---

## FASE 5 — TESTES ENTRE NÍVEIS (Cross-Level)

### 5.1 Isolamento de Dados
- [ ] Criar 2 consultorias diferentes (A e B)
- [ ] Cada uma com 1 empresa
- [ ] Login como Consultoria A → NÃO vê empresas/dados da Consultoria B
- [ ] Login como Consultoria B → NÃO vê empresas/dados da Consultoria A
- [ ] Login como Empresa da Consultoria A → NÃO vê dados da Empresa de B

### 5.2 Tentativa de Acesso via API (tRPC)
- [ ] Como empresa, tentar chamar `tenants.list` via DevTools → só retorna próprio tenant
- [ ] Como consultoria, tentar chamar `tenants.list` → só retorna próprio + filhas
- [ ] Como empresa, tentar chamar `auditLogs.list` → erro FORBIDDEN

### 5.3 Tentativa de Acesso via URL Direta
- [ ] Como empresa, digitar `/admin/metrics` na barra → redireciona para `/dashboard`
- [ ] Como empresa, digitar `/companies` → bloqueado
- [ ] Como consultoria, digitar `/admin/metrics` → redireciona para `/dashboard`

### 5.4 Limites de Plano Cross-Level
- [ ] Consultoria no plano Starter cria 1 empresa → OK
- [ ] Tenta criar 2ª empresa → erro de limite
- [ ] Admin faz upgrade para Pro → consultoria consegue criar mais empresas
- [ ] Consultoria convida 5 usuários (limite Starter) → OK
- [ ] Tenta convidar 6º → erro de limite

---

## FASE 6 — FLUXO COMPLETO END-TO-END

### 6.1 Fluxo Comercial Completo
1. [ ] Consultoria se registra
2. [ ] Escolhe plano Pro (trial 14 dias)
3. [ ] Cria empresa-cliente com CNPJ válido
4. [ ] Cria setores e cadastra colaboradores
5. [ ] Cria avaliação COPSOQ-II
6. [ ] Envia convites para colaboradores
7. [ ] Colaboradores respondem o questionário
8. [ ] Consultor analisa resultados (analytics, dashboard, matriz)
9. [ ] Cria plano de ação
10. [ ] Verifica conformidade NR-01 (checklist, timeline)
11. [ ] Gera laudo técnico (PDF)
12. [ ] Convida usuário da empresa para ver os resultados
13. [ ] Empresa acessa dashboard e relatórios
14. [ ] Consultoria cria proposta comercial e envia ao cliente
15. [ ] Consultoria abre ticket de suporte
16. [ ] Admin responde ticket

---

## REGISTRO DE RESULTADOS

### Dados de Teste Utilizados

| Campo | Valor |
|---|---|
| Admin | ricardo@consultoriasst.com.br |
| Consultoria | |
| Empresa | |
| User Empresa | |
| Plano testado | |
| Data do teste | |

### Bugs Encontrados

| # | Fase | Passo | Descrição | Severidade | Status |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

### Observações Gerais

_Anotar observações, melhorias sugeridas, ou comportamentos inesperados aqui._

---

**Tempo estimado:** 2-4 horas para teste completo
**Versão do roteiro:** 1.0
