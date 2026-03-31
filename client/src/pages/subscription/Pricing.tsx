/**
 * PRICING PAGE
 *
 * Página pública de pricing mostrando todos os planos disponíveis
 * Alinhada com a Landing Page (CPF/CNPJ, SamurAI)
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { PricingCard } from "@/components/subscription/PricingCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Check, X, Sparkles, Shield, Building2 } from "lucide-react";

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
    navigate(`/subscription/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Features alinhadas com a Landing Page
  const planFeatures = {
    starter: [
      "Cadastro via CPF (pessoa física)",
      "3 empresas/mês incluídas",
      "20 convites COPSOQ inclusos/mês",
      "SamurAI completo (10 fases NR-01)",
      "Propostas comerciais automáticas",
      "Relatórios padrão + Exportação PDF",
      "Suporte por email",
      "R$ 12,00/convite COPSOQ excedente",
    ],
    pro: [
      "Cadastro via CNPJ (pessoa jurídica)",
      "10 empresas/mês incluídas",
      "100 convites COPSOQ inclusos/mês",
      "SamurAI completo (10 fases NR-01)",
      "Propostas comerciais automáticas",
      "Benchmark setorial + PDF ilimitado",
      "Suporte prioritário",
      "R$ 10,00/convite COPSOQ excedente",
    ],
    enterprise: [
      "Cadastro via CNPJ (pessoa jurídica)",
      "30 empresas/mês incluídas",
      "500 convites COPSOQ inclusos/mês",
      "Tudo do Professional",
      "White-label (sua marca) + API access",
      "Relatórios personalizados",
      "Suporte dedicado",
      "R$ 8,00/convite COPSOQ excedente",
    ],
  };

  // Map plan names to match database (starter, pro/professional, enterprise)
  const getPlanFeatures = (planName: string) => {
    const key = planName.toLowerCase();
    if (key.includes("starter")) return planFeatures.starter;
    if (key.includes("pro")) return planFeatures.pro;
    if (key.includes("enterprise")) return planFeatures.enterprise;
    return planFeatures.starter;
  };

  const getPlanPopular = (planName: string) => {
    const key = planName.toLowerCase();
    return key.includes("pro");
  };

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-400 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Powered by SamurAI — Inteligência Artificial
        </div>
        <h1 className="text-4xl font-bold mb-4">Escolha o Plano Ideal</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gestão completa de riscos psicossociais com IA. Convites COPSOQ inclusos em todos os planos.
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
            features={getPlanFeatures(plan.name)}
            isPopular={getPlanPopular(plan.name)}
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
                    <th className="text-center p-4 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <span>Starter</span>
                        <span className="text-xs text-muted-foreground font-normal">CPF</span>
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <span>Professional</span>
                        <span className="text-xs text-amber-500 font-normal">CNPJ — Popular</span>
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold">
                      <div className="flex flex-col items-center gap-1">
                        <span>Enterprise</span>
                        <span className="text-xs text-muted-foreground font-normal">CNPJ</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Tipo de Cadastro", starter: "CPF", pro: "CNPJ", enterprise: "CNPJ" },
                    { name: "Empresas incluídas/mês", starter: "3", pro: "10", enterprise: "30" },
                    { name: "Convites COPSOQ inclusos/mês", starter: "20", pro: "100", enterprise: "500" },
                    { name: "Excedente por convite", starter: "R$ 12", pro: "R$ 10", enterprise: "R$ 8" },
                    { name: "SamurAI (Agente IA)", starter: "Completo (10 fases)", pro: "Completo (10 fases)", enterprise: "Completo (10 fases)" },
                    { name: "Propostas Comerciais", starter: true, pro: true, enterprise: true },
                    { name: "COPSOQ-II", starter: true, pro: true, enterprise: true },
                    { name: "Inventário de Riscos", starter: true, pro: true, enterprise: true },
                    { name: "Plano de Ação", starter: true, pro: true, enterprise: true },
                    { name: "Benchmark Setorial", starter: false, pro: true, enterprise: true },
                    { name: "PDF Export", starter: true, pro: true, enterprise: true },
                    { name: "White-label", starter: false, pro: false, enterprise: true },
                    { name: "API Access", starter: false, pro: false, enterprise: true },
                    { name: "Relatórios Personalizados", starter: false, pro: false, enterprise: true },
                    { name: "Suporte", starter: "Email", pro: "Prioritário", enterprise: "Dedicado" },
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
              q: "Qual a diferenca entre CPF e CNPJ?",
              a: "O plano Starter (CPF) e para psicologos e consultores autonomos que atuam como pessoa fisica. Os planos Professional e Enterprise (CNPJ) sao para consultorias formalizadas como pessoa juridica, com mais recursos e melhor custo por empresa.",
            },
            {
              q: "O que e o SamurAI?",
              a: "O SamurAI e nosso agente de inteligencia artificial que automatiza as 10 fases da gestao de riscos psicossociais (NR-01). Ele faz desde o cadastro da empresa ate a emissao do certificado de conformidade, gerando todos os documentos necessarios.",
            },
            {
              q: "Posso mudar de plano a qualquer momento?",
              a: "Sim! Voce pode fazer upgrade ou downgrade do seu plano a qualquer momento. O ajuste sera proporcional ao tempo restante.",
            },
            {
              q: "Como funciona a empresa adicional?",
              a: "Cada plano inclui um numero de empresas por mes. Se precisar atender mais empresas, basta pagar o valor adicional por empresa conforme seu plano.",
            },
            {
              q: "Quais metodos de pagamento sao aceitos?",
              a: "Aceitamos cartoes de credito via Stripe e Mercado Pago (PIX, boleto). Para planos Enterprise, tambem aceitamos transferencia bancaria.",
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
              Para grandes consultorias ou necessidades especificas, entre em contato
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" size="lg" onClick={() => window.location.href = "mailto:contato@blackbeltconsultoria.com"}>
              Falar com Vendas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
