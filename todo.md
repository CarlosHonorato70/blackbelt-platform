# Black Belt Platform - TODO

## Funcionalidades Implementadas
- [x] Schema multi-tenant com 12 tabelas
- [x] RBAC (Role-Based Access Control)
- [x] Auditoria completa de operações
- [x] Gestão de Empresas (Tenants)
- [x] Gestão de Setores
- [x] Gestão de Colaboradores
- [x] Contexto de seleção de empresa
- [x] Seletor de empresa no sidebar
- [x] Logo da Black Belt integrada
- [x] Página inicial com serviços
- [x] Avaliações NR-01 (estrutura)
- [x] Correção de erro removeChild
- [x] Botão destacado para seleção de empresa (modal/dialog)

## Funcionalidades em Desenvolvimento
- [ ] Página de Avaliações NR-01 completa
- [ ] Formulário de avaliação de riscos psicossociais
- [ ] Dashboard de indicadores
- [ ] Relatórios de compliance NR-01
- [ ] Sistema de convites de usuários
- [ ] Gestão de perfis e permissões
- [ ] Auditoria visual (logs)
- [ ] Exportação de dados (DSR LGPD)
- [ ] Notificações em tempo real

## Bugs Corrigidos
- [x] Erro NotFoundError: removeChild
- [x] Join de setores na listagem de colaboradores

## Bugs Corrigidos (Continuação)
- [x] Botão "Ações" não funciona na página de Avaliações de Risco Psicossocial



## Fases de Desenvolvimento

### Fase 1: Formulário de Avaliação de Riscos Psicossociais
- [x] Criar página com formulário completo
- [x] Campos: Identificação de riscos, Avaliação de gravidade, Medidas de controle
- [ ] Integração com banco de dados (tRPC)
- [x] Validação de campos obrigatórios

### Fase 2: Dashboard de Indicadores
- [ ] Gráficos de riscos por setor
- [ ] Indicadores de saúde mental
- [ ] Taxa de conformidade NR-01
- [ ] Comparativos temporais

### Fase 3: Relatórios de Compliance NR-01
- [ ] Geração de PDF com avaliações
- [ ] Checklist de conformidade
- [ ] Plano de ação integrado
- [ ] Exportação em múltiplos formatos

### Fase 4: Sistema de Convites de Usuários
- [ ] Envio de convites por e-mail
- [ ] Links de ativação
- [ ] Gestão de convites pendentes
- [ ] Resgate de convites

### Fase 5: Gestão de Perfis e Permissões
- [ ] CRUD de roles customizadas
- [ ] Atribuição de permissões granulares
- [ ] Controle por tenant
- [ ] Auditoria de mudanças de permissões

### Fase 6: Auditoria Visual (Logs)
- [ ] Dashboard de logs de auditoria
- [ ] Filtros por usuário, ação, data
- [ ] Visualização de mudanças (before/after)
- [ ] Exportação de logs

### Fase 7: Exportação de Dados (DSR LGPD)
- [ ] Formulário de solicitação DSR
- [ ] Geração de arquivo com dados pessoais
- [ ] Rastreamento de solicitações
- [ ] Conformidade com prazos LGPD

### Fase 8: Notificações em Tempo Real
- [ ] Sistema de notificações push
- [ ] Notificações por e-mail
- [ ] Centro de notificações na UI
- [ ] Preferências de notificações por usuário

