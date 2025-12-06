# Roadmap de Implementação - Próximas Etapas

Este documento descreve as próximas etapas para completar a comercialização da Black Belt Platform.

## ✅ Fase 1: Concluída (Este PR)

### Implementado
- [x] Licenciamento e termos legais (LICENSE, TERMS_OF_SERVICE.md, PRIVACY_POLICY.md)
- [x] Schema de banco de dados para assinaturas (6 tabelas)
- [x] API tRPC para gestão de assinaturas (11 endpoints)
- [x] Middleware de verificação de limites
- [x] Configuração de gateways de pagamento
- [x] Documentação de preços (PRICING.md)
- [x] Seed data para planos iniciais
- [x] Testes automatizados (24 novos testes)

## 🚀 Fase 2: Integração com Gateways de Pagamento

### Stripe Integration

**Instalar SDK:**
```bash
pnpm add stripe @stripe/stripe-js
```

**Configurar variáveis de ambiente:**
```env
STRIPE_ENABLED=true
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Implementar:**
1. Criar router `server/routers/stripe.ts`:
   - `createCheckoutSession` - Iniciar processo de assinatura
   - `createCustomerPortal` - Gerenciar assinatura existente
   - `handleWebhook` - Processar eventos do Stripe

2. Criar componente frontend `client/src/components/SubscriptionCheckout.tsx`

3. Implementar webhook endpoint em `server/_core/index.ts`:
   ```typescript
   app.post('/webhooks/stripe', express.raw({type: 'application/json'}), stripeWebhookHandler);
   ```

### Mercado Pago Integration

**Instalar SDK:**
```bash
pnpm add mercadopago
```

**Configurar variáveis de ambiente:**
```env
MERCADO_PAGO_ENABLED=true
MERCADO_PAGO_PUBLIC_KEY=APP_USR_...
MERCADO_PAGO_ACCESS_TOKEN=APP_USR_...
```

**Implementar:**
1. Criar router `server/routers/mercadopago.ts`
2. Implementar preference creation e webhook handling

### Timeline Estimado
- **Tempo**: 2-3 semanas
- **Prioridade**: Alta 🔴
- **Dependências**: API keys dos gateways

## 🎨 Fase 3: Interface de Usuário

### Páginas a Criar

1. **Página de Pricing Pública** (`/pricing`)
   - Comparação visual de planos
   - Botão "Iniciar Teste Grátis"
   - FAQ sobre planos

2. **Página de Checkout** (`/checkout`)
   - Formulário de informações de pagamento
   - Integração com Stripe Elements ou Mercado Pago
   - Confirmação de assinatura

3. **Dashboard de Assinatura** (`/settings/subscription`)
   - Status da assinatura atual
   - Métricas de uso (usuários, storage, API calls)
   - Botão para upgrade/downgrade
   - Botão para cancelar assinatura
   - Histórico de faturas

4. **Modal de Limite Excedido**
   - Alertar quando atingir 80% dos limites
   - Sugerir upgrade quando exceder limites
   - Bloquear ações quando necessário

### Componentes Reutilizáveis

```
client/src/components/subscription/
├── PricingCard.tsx          # Card de plano individual
├── PricingComparison.tsx    # Tabela comparativa
├── SubscriptionBadge.tsx    # Badge do plano atual
├── UsageMetrics.tsx         # Métricas de uso
├── InvoiceList.tsx          # Lista de faturas
├── UpgradeDialog.tsx        # Dialog de upgrade
└── PaymentMethodForm.tsx    # Formulário de pagamento
```

### Timeline Estimado
- **Tempo**: 3-4 semanas
- **Prioridade**: Alta 🔴
- **Dependências**: Fase 2 (gateways)

## 📄 Fase 4: Exportação PDF de Propostas

### Implementação

**Instalar biblioteca:**
```bash
pnpm add pdfkit
# ou
pnpm add puppeteer
```

**Criar router:**
```typescript
// server/routers/pdfExport.ts
export const pdfExportRouter = router({
  exportProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Buscar proposta
      // Gerar PDF com logo e branding
      // Retornar URL ou base64
    }),
});
```

**Features:**
- Logo e branding do tenant (White-label para Enterprise)
- Tabela de itens da proposta
- Totais e impostos
- Assinatura digital (opcional)
- Envio por email

### Timeline Estimado
- **Tempo**: 2 semanas
- **Prioridade**: Média 🟡
- **Dependências**: Nenhuma

## 🎯 Fase 5: White-Label (Enterprise)

### Implementação

**Adicionar campos ao tenant:**
```sql
ALTER TABLE tenants ADD COLUMN logo_url VARCHAR(500);
ALTER TABLE tenants ADD COLUMN primary_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN secondary_color VARCHAR(7);
ALTER TABLE tenants ADD COLUMN custom_domain VARCHAR(255);
```

**Criar configuração de branding:**
```typescript
// client/src/lib/branding.ts
export function getTenantBranding(tenantId: string) {
  // Buscar configurações do tenant
  // Retornar: logo, cores, domínio
}
```

**Aplicar branding:**
1. Logo no header
2. Cores nos componentes (via CSS variables)
3. Favicon personalizado
4. Emails transacionais com branding

### Timeline Estimado
- **Tempo**: 2-3 semanas
- **Prioridade**: Média 🟡
- **Dependências**: Verificar plano Enterprise

## 🔌 Fase 6: Webhooks e API Pública

### Webhooks

**Criar sistema de webhooks:**
```typescript
// server/routers/webhooks.ts
export const webhooksRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // Listar webhooks configurados
  }),
  
  create: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      events: z.array(z.enum([
        'assessment.created',
        'proposal.sent',
        'subscription.updated',
      ])),
    }))
    .mutation(async ({ input, ctx }) => {
      // Criar webhook
    }),
  
  delete: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Deletar webhook
    }),
});
```

**Eventos disponíveis:**
- `assessment.created`
- `assessment.completed`
- `proposal.created`
- `proposal.sent`
- `proposal.accepted`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `invoice.paid`

### API Pública (REST)

**Criar endpoints REST:**
```
GET    /api/v1/assessments
POST   /api/v1/assessments
GET    /api/v1/assessments/:id
GET    /api/v1/proposals
POST   /api/v1/proposals
GET    /api/v1/proposals/:id
```

**Autenticação:**
- API keys geradas por tenant
- Rate limiting baseado no plano
- Documentação com Swagger/OpenAPI

### Timeline Estimado
- **Tempo**: 3-4 semanas
- **Prioridade**: Média 🟡
- **Dependências**: Verificar plano (Pro/Enterprise)

## 🔐 Fase 7: Segurança Adicional

### Implementar

1. **2FA/MFA**
   - TOTP (Google Authenticator, Authy)
   - SMS (Twilio)
   - Email

2. **IP Whitelisting (Enterprise)**
   - Permitir acesso apenas de IPs específicos
   - Configurável por tenant

3. **Audit Logs Avançados**
   - Exportação de logs
   - Alertas de atividades suspeitas
   - Retention policy configurável

4. **Session Management**
   - Listar sessões ativas
   - Revogar sessões remotamente
   - Timeout configurável por plano

### Timeline Estimado
- **Tempo**: 2-3 semanas
- **Prioridade**: Baixa 🟢
- **Dependências**: Nenhuma

## 📊 Fase 8: Analytics e Métricas

### Implementar Dashboard de Métricas

**Para Administradores da Plataforma:**
- MRR (Monthly Recurring Revenue)
- Churn rate
- Conversão de trial para pago
- Planos mais populares
- Uso médio por plano

**Para Clientes:**
- Uso de recursos ao longo do tempo
- Avaliações completadas
- Propostas geradas e aceitas
- ROI estimado

### Ferramentas Sugeridas
- Google Analytics / Mixpanel
- Metabase / Redash (BI self-hosted)
- Custom dashboard com Recharts

### Timeline Estimado
- **Tempo**: 2-3 semanas
- **Prioridade**: Baixa 🟢
- **Dependências**: Dados históricos de uso

## 📱 Fase 9: Mobile App (React Native)

### Funcionalidades Prioritárias

1. **Visualização**
   - Dashboard de métricas
   - Lista de avaliações
   - Visualizar propostas

2. **Ações Básicas**
   - Criar nova avaliação
   - Aprovar/rejeitar propostas
   - Notificações push

3. **Offline Mode**
   - Preencher avaliações offline
   - Sincronizar quando online

### Timeline Estimado
- **Tempo**: 8-12 semanas
- **Prioridade**: Baixa 🟢
- **Dependências**: Fase 6 (API Pública)

## 🎓 Fase 10: Onboarding Automatizado

### Implementar

1. **Wizard de Configuração Inicial**
   - Bem-vindo e tour da plataforma
   - Criar primeira empresa/tenant
   - Convidar primeiros usuários
   - Configurar primeiro setor

2. **Templates por Setor**
   - Varejo
   - Saúde
   - Indústria
   - Construção Civil

3. **Tutoriais Interativos**
   - Video tours
   - Tooltips contextuais
   - Checklist de progresso

### Timeline Estimado
- **Tempo**: 2-3 semanas
- **Prioridade**: Média 🟡
- **Dependências**: Nenhuma

## 📋 Priorização Sugerida

### Sprint 1-2 (4 semanas) - CRÍTICO
1. Integração Stripe/Mercado Pago
2. UI de Checkout e Assinatura

### Sprint 3-4 (4 semanas) - ALTA
3. Dashboard de uso e limites
4. Exportação PDF

### Sprint 5-6 (4 semanas) - MÉDIA
5. White-label básico
6. Webhooks

### Sprint 7+ (contínuo) - BAIXA
7. 2FA/MFA
8. Analytics avançado
9. Mobile app

## 🛠️ Ferramentas e Recursos

### Desenvolvimento
- **Stripe Docs**: https://stripe.com/docs/billing/subscriptions
- **Mercado Pago Docs**: https://www.mercadopago.com.br/developers
- **pdfkit**: https://pdfkit.org/
- **React Native**: https://reactnative.dev/

### Testes
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Mercado Pago Sandbox**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-integration

### Infraestrutura
- **Redis**: Para cache e rate limiting
- **S3/Cloudinary**: Para armazenamento de logos
- **SendGrid/Postmark**: Para emails transacionais

## 📞 Suporte

Para dúvidas sobre implementação:
- Email: dev@blackbelt-consultoria.com
- GitHub: https://github.com/CarlosHonorato70/blackbelt-platform

---

**Última atualização:** Dezembro 2024  
**Status:** Roadmap Ativo
