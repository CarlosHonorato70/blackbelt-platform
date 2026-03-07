/**
 * PRICING PAGE
 * 
 * Página pública de pricing mostrando todos os planos disponíveis
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { PricingCard } from "@/components/subscription/PricingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X } from "lucide-react";

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Buscar planos públicos
  const { data: plans, isLoading } = trpc.subscriptions.listPublicPlans.useQuery();
  
  // Buscar assinatura atual (se estiver logado)
  const { data: currentSubscription } = trpc.subscriptions.getCurrentSubscription.useQuery(undefined, {
    retry: false,
  });

  const handleSelectPlan = (planId: string) => {
    // Redirecionar para checkout
    navigate(`/subscription/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Mapear features dos planos
  const planFeatures = {
    starter: [
      "1 empresa",
      "Até 5 usuários",
      "1 GB de armazenamento",
      "Avaliações de risco ilimitadas",
      "Relatórios básicos",
      "Suporte por email",
      "14 dias de teste grátis",
    ],
    pro: [
      "Até 10 empresas",
      "Até 50 usuários por empresa",
      "10 GB de armazenamento",
      "Avaliações de risco ilimitadas",
      "Relatórios avançados com insights",
      "API de integração",
      "Exportação de dados",
      "Suporte prioritário por email e chat",
      "14 dias de teste grátis",
    ],
    enterprise: [
      "Empresas ilimitadas",
      "Usuários ilimitados",
      "Armazenamento ilimitado",
      "Avaliações de risco ilimitadas",
      "Relatórios avançados personalizados",
      "API completa + Webhooks",
      "White-label (marca própria)",
      "Domínio personalizado",
      "SLA 99.9% de uptime",
      "Suporte dedicado 24/7",
      "Gerente de conta dedicado",
      "30 dias de teste grátis",
    ],
  };

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Escolha o Plano Ideal</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gestão completa de riscos psicossociais e precificação inteligente
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="monthly">Mensal</TabsTrigger>
              <TabsTrigger value="yearly">
                Anual
                <span className="ml-2 text-xs bg-primary text-primary-foreground rounded px-2 py-0.5">
                  -17%
                </span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {plans?.map((plan) => (
          <PricingCard
            key={plan.id}
            name={plan.name}
            displayName={plan.displayName}
            description={plan.description || ""}
            monthlyPrice={plan.monthlyPrice}
            yearlyPrice={plan.yearlyPrice}
            billingCycle={billingCycle}
            features={planFeatures[plan.name as keyof typeof planFeatures] || []}
            isPopular={plan.name === "pro"}
            isCurrentPlan={currentSubscription?.planId === plan.id}
            onSelect={() => handleSelectPlan(plan.id)}
          />
        ))}
      </div>

      {/* Feature Comparison Table */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Comparação de Recursos</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Recurso</th>
                    <th className="text-center p-4 font-semibold">Starter</th>
                    <th className="text-center p-4 font-semibold">Pro</th>
                    <th className="text-center p-4 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Empresas", starter: "1", pro: "10", enterprise: "Ilimitadas" },
                    { name: "Usuários", starter: "5", pro: "50/empresa", enterprise: "Ilimitados" },
                    { name: "Armazenamento", starter: "1 GB", pro: "10 GB", enterprise: "Ilimitado" },
                    { name: "Avaliações de Risco", starter: true, pro: true, enterprise: true },
                    { name: "Relatórios Básicos", starter: true, pro: true, enterprise: true },
                    { name: "Relatórios Avançados", starter: false, pro: true, enterprise: true },
                    { name: "API de Integração", starter: false, pro: true, enterprise: true },
                    { name: "Webhooks", starter: false, pro: false, enterprise: true },
                    { name: "White-label", starter: false, pro: false, enterprise: true },
                    { name: "SLA", starter: "Melhor esforço", pro: "99.0%", enterprise: "99.9%" },
                    { name: "Suporte", starter: "Email", pro: "Email + Chat", enterprise: "Dedicado 24/7" },
                  ].map((feature, index) => (
                    <tr key={index} className="border-b last:border-b-0">
                      <td className="p-4 font-medium">{feature.name}</td>
                      <td className="p-4 text-center">
                        {typeof feature.starter === "boolean" ? (
                          feature.starter ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.starter
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof feature.pro === "boolean" ? (
                          feature.pro ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.pro
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {typeof feature.enterprise === "boolean" ? (
                          feature.enterprise ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          feature.enterprise
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Perguntas Frequentes</h2>
        <div className="space-y-4">
          {[
            {
              q: "Posso mudar de plano a qualquer momento?",
              a: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O ajuste será proporcional ao tempo restante.",
            },
            {
              q: "O que acontece após o período de teste?",
              a: "Após o período de teste (14 ou 30 dias), você será cobrado automaticamente conforme o plano escolhido. Você pode cancelar a qualquer momento durante o trial sem custo.",
            },
            {
              q: "Como funcionam os descontos anuais?",
              a: "Ao escolher o pagamento anual, você recebe 17% de desconto em relação ao pagamento mensal. É como ganhar 2 meses grátis!",
            },
            {
              q: "Posso cancelar minha assinatura?",
              a: "Sim, você pode cancelar sua assinatura a qualquer momento. Após o cancelamento, você continuará tendo acesso até o final do período pago.",
            },
            {
              q: "Quais métodos de pagamento são aceitos?",
              a: "Aceitamos cartões de crédito via Stripe (internacional) e Mercado Pago (Brasil). Para planos Enterprise, também aceitamos boleto e transferência bancária.",
            },
          ].map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-16">
        <Card className="max-w-2xl mx-auto bg-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-2xl">Precisa de um Plano Personalizado?</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Para grandes empresas ou necessidades específicas, entre em contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" size="lg" onClick={() => window.location.href = "mailto:contato@blackbelt-consultoria.com"}>
              Falar com Vendas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
