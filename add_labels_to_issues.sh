#!/bin/bash

# Script para adicionar labels às issues no GitHub
# Uso: ./add_labels_to_issues.sh

REPO="CarlosHonorato70/blackbelt-platform"

# Array com mapeamento de issue para labels
# Formato: "issue_number:label1,label2,label3"
declare -a ISSUE_LABELS=(
  # Módulo de Conformidade NR-01 (6 issues)
  "1:conformidade,nr-01,feature"
  "2:conformidade,nr-01,feature"
  "3:conformidade,nr-01,feature"
  "4:conformidade,nr-01,feature"
  "5:conformidade,nr-01,feature"
  "6:conformidade,lgpd,feature"
  
  # Módulo de Precificação (6 issues)
  "7:precificacao,feature"
  "8:precificacao,feature"
  "9:precificacao,feature"
  "10:precificacao,backend,feature"
  "11:precificacao,feature"
  "12:precificacao,integracao,feature"
  
  # Funcionalidades Transversais (8 issues)
  "13:seguranca,autenticacao,feature"
  "14:seguranca,multi-tenant,feature"
  "15:seguranca,rbac,feature"
  "16:feature,onboarding"
  "17:seguranca,rbac,feature"
  "18:dashboard,feature"
  "19:onboarding,ux,feature"
  "20:notificacoes,feature"
  
  # Roadmap - Fase 2 (7 issues)
  "21:dashboard,testes,feature"
  "22:precificacao,exportacao,feature"
  "23:integracao,crm,feature"
  "24:api,feature"
  "25:integracao,webhooks,feature"
  "26:analytics,feature"
  "27:ia,machine-learning,feature"
)

echo "🏷️  Adicionando labels às issues..."
echo "Repositório: $REPO"
echo ""

# Contador
count=0
total=${#ISSUE_LABELS[@]}

# Iterar sobre cada issue
for issue_data in "${ISSUE_LABELS[@]}"; do
  IFS=':' read -r issue_number labels <<< "$issue_data"
  
  count=$((count + 1))
  
  echo "[$count/$total] Adicionando labels à issue #$issue_number: $labels"
  
  # Adicionar labels usando GitHub CLI
  gh issue edit "$issue_number" \
    --repo "$REPO" \
    --add-label "$labels" \
    2>&1 | grep -E "(✓|Error|error)" || echo "  ✅ Labels adicionadas"
  
  # Pequeno delay para evitar rate limiting
  sleep 0.3
done

echo ""
echo "✨ Concluído! Labels foram adicionadas a $count issues."
echo "Verifique em: https://github.com/$REPO/issues"

