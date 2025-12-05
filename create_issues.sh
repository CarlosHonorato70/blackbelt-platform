#!/bin/bash

# Script para criar issues no GitHub para cada funcionalidade
# Uso: ./create_issues.sh

REPO="CarlosHonorato70/blackbelt-platform"

# Array com todas as funcionalidades
# Formato: "Título|Descrição"
declare -a ISSUES=(
  # Módulo de Conformidade NR-01
  "feat: Avaliações de Riscos Psicossociais|Implementar formulário completo com 30+ fatores de risco para avaliações NR-01 conforme Portaria MTE nº 1.419/2024. Incluir validação, cálculo automático de níveis e exportação de dados."
  
  "feat: Matriz de Probabilidade × Gravidade|Cálculo automático de níveis de risco baseado em probabilidade e gravidade. Implementar matriz 5x5 com cores visuais e recomendações automáticas de ações."
  
  "feat: Planos de Ação|Sistema de rastreamento de ações corretivas com status, prazos, responsáveis e evidências. Incluir notificações de vencimento e relatórios de progresso."
  
  "feat: Relatórios de Compliance|Geração automática de relatórios de compliance NR-01 em PDF com gráficos, tabelas e recomendações. Incluir assinatura digital e data de geração."
  
  "feat: Auditoria Completa|Log de todas as ações do sistema com rastreabilidade completa. Incluir usuário, timestamp, IP, ação, valores antigos/novos e contexto."
  
  "feat: Exportação LGPD|Implementar Data Subject Requests (DSR) para conformidade LGPD. Permitir exportação de todos os dados pessoais em formato estruturado."
  
  # Módulo de Precificação
  "feat: Gestão de Clientes|CRUD completo de clientes para propostas comerciais. Incluir campos de contato, endereço, histórico de propostas e status."
  
  "feat: Catálogo de Serviços|Gestão de serviços oferecidos com preços base, descrição, duração estimada e categorias. Permitir ativação/desativação de serviços."
  
  "feat: Parâmetros de Precificação|Configuração de regimes tributários (MEI, SN, LP, Autônomo) com alíquotas e cálculos específicos. Permitir ajustes por tenant."
  
  "feat: Cálculo de Hora Técnica|Cálculo automático com 4 regimes tributários diferentes. Incluir margem, impostos, encargos e gerar valor final com precisão."
  
  "feat: Geração de Propostas|Propostas comerciais com descontos, impostos e cálculos automáticos. Incluir versionamento, histórico e rastreamento de aceitação."
  
  "feat: Integração Avaliação → Proposta|Recomendação automática de serviços baseada em avaliação NR-01. Pré-popular proposta com dados da avaliação."
  
  # Funcionalidades Transversais
  "feat: Autenticação OAuth 2.0|Integração com Manus OAuth para autenticação segura. Incluir login, logout, refresh token e gestão de sessão."
  
  "feat: Multi-Tenant|Isolamento completo de dados por empresa com Row-Level Security (RLS). Garantir que cada tenant veja apenas seus dados."
  
  "feat: RBAC + ABAC|Controle de acesso granular com Role-Based (admin, consultant, viewer) e Attribute-Based (tenant, department). Implementar middleware de autorização."
  
  "feat: Convites de Usuários|Sistema de onboarding de novos usuários via email. Incluir tokens de convite, expiração e gestão de permissões iniciais."
  
  "feat: Perfis e Permissões|Gestão de papéis (roles) e permissões granulares. Permitir criar papéis customizados com permissões específicas."
  
  "feat: Dashboard em Tempo Real|Monitoramento de testes E2E com gráficos, métricas e status. Incluir filtros, exportação e alertas de falhas."
  
  "feat: Guia Interativo|Tutorial com 12 passos para onboarding de novos usuários. Incluir tooltips, highlights e progresso visual."
  
  "feat: Notificações em Tempo Real|Sistema de notificações para eventos importantes (propostas, convites, alertas). Incluir email, push e in-app."
  
  # Roadmap Fase 2
  "feat: Dashboard de Testes E2E Avançado|Expandir dashboard com filtros avançados, histórico de testes e exportação de relatórios em PDF/Excel."
  
  "feat: Exportação de Propostas em PDF|Gerar propostas em PDF com logo, formatação profissional, assinatura digital e código QR."
  
  "feat: Integração com CRM|Sincronizar dados com sistemas CRM populares (Salesforce, HubSpot, Pipedrive). Bidirecional com webhooks."
  
  "feat: API Pública REST|Expor endpoints REST para integração externa. Incluir autenticação, rate limiting e documentação OpenAPI."
  
  "feat: Webhooks|Implementar webhooks para eventos do sistema (proposta criada, avaliação concluída, etc). Permitir retry automático."
  
  "feat: Analytics Avançado|Dashboard com métricas e KPIs detalhados (conversão, valor médio, tempo médio). Incluir previsões e tendências."
  
  "feat: Machine Learning - Previsão de Riscos|Usar ML para prever riscos baseado em histórico de avaliações. Incluir recomendações automáticas."
)

echo "🚀 Criando issues no GitHub..."
echo "Repositório: $REPO"
echo ""

# Contador
count=0
total=${#ISSUES[@]}

# Iterar sobre cada issue
for issue_data in "${ISSUES[@]}"; do
  IFS='|' read -r title description <<< "$issue_data"
  
  count=$((count + 1))
  
  echo "[$count/$total] Criando issue: $title"
  
  # Criar a issue usando GitHub CLI (sem labels para evitar erro)
  gh issue create \
    --repo "$REPO" \
    --title "$title" \
    --body "$description" \
    2>&1 | grep -E "(✓|Error|error)" || echo "  ✅ Issue criada"
  
  # Pequeno delay para evitar rate limiting
  sleep 0.5
done

echo ""
echo "✨ Concluído! $count issues foram criadas."
echo "Verifique em: https://github.com/$REPO/issues"

