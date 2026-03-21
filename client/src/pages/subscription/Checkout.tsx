/**
 * CHECKOUT PAGE
 *
 * Página de checkout para assinar um plano.
 * Modelo: 1 empresa grátis para sempre. Para mais empresas, assinar plano.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Smartphone, CheckCircle2, Shield, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [gateway, setGateway] = useState<"stripe" | "mercadopago">("mercadopago");
  const [isProcessing, setIsProcessing] = useState(false);

  // Parse URL params
  useEffect(() => {
    const plan = searchParams.get("plan");
    const cycle = searchParams.get("cycle");
    if (plan) setPlanId(plan);
    if (cycle === "yearly") setBillingCycle("yearly");
  }, [searchParams]);

  // Buscar detalhes do plano
  const { data: plan, isLoading: loadingPlan } = trpc.subscriptions.getPlan.useQuery(
    { planId },
    { enabled: !!planId }
  );

  // Verificar gateways disponíveis
  const { data: stripeConfig } = trpc.stripe.isEnabled.useQuery();
  const { data: mercadoPagoConfig } = trpc.mercadoPago.isEnabled.useQuery();

  // Auto-selecionar gateway habilitado
  useEffect(() => {
    if (mercadoPagoConfig?.enabled) {
      setGateway("mercadopago");
    } else if (stripeConfig?.enabled) {
      setGateway("stripe");
    }
  }, [stripeConfig, mercadoPagoConfig]);

  // Mutations
  const createStripeCheckout = trpc.stripe.createCheckoutSession.useMutation();
  const createMercadoPagoPreference = trpc.mercadoPago.createPreference.useMutation();

  // Handler para checkout com pagamento
  const handleCheckout = async () => {
    if (!planId) return;
    setIsProcessing(true);

    try {
      const successUrl = `${window.location.origin}/subscription/success`;
      const cancelUrl = `${window.location.origin}/pricing`;

      if (gateway === "stripe") {
        const result = await createStripeCheckout.mutateAsync({
          planId,
          billingCycle,
          successUrl,
          cancelUrl,
        });
        if (result.url) window.location.href = result.url;
      } else {
        const result = await createMercadoPagoPreference.mutateAsync({
          planId,
          billingCycle,
          successUrl,
          failureUrl: `${window.location.origin}/subscription/failure`,
          pendingUrl: `${window.location.origin}/subscription/pending`,
        });
        if (result.initPoint) window.location.href = result.initPoint;
      }
    } catch (error) {
      toast({
        title: "Erro ao processar pagamento",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (loadingPlan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Plano nao encontrado</CardTitle>
            <CardDescription>O plano selecionado nao existe ou nao esta disponivel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/subscription/pricing")}>Voltar para Planos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  const priceFormatted = (price / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Assinar Plano</h1>
        <p className="text-muted-foreground">
          Complete os detalhes para ativar seu plano
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Plano Selecionado */}
          <Card>
            <CardHeader>
              <CardTitle>Plano Selecionado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{plan.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{priceFormatted}</p>
                  <p className="text-sm text-muted-foreground">
                    /{billingCycle === "monthly" ? "mes" : "ano"}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  <p className="font-semibold text-amber-800">
                    1 empresa gratis incluida
                  </p>
                </div>
                <p className="text-sm text-amber-700">
                  Voce ja pode usar a plataforma com 1 empresa gratuitamente, sem limite de tempo.
                  Assine um plano para atender mais empresas e acessar recursos avancados.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* O que está incluído */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                O que esta incluido no plano {plan.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  "SamurAI — Agente de IA para conformidade NR-01",
                  "Cadastro de setores e colaboradores",
                  "Questionario COPSOQ-II com envio por email",
                  "Inventario de riscos psicossociais",
                  "Planos de acao e compliance NR-01",
                  "Exportacao de documentos em PDF",
                  "Suporte tecnico",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Gateway de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Metodo de Pagamento</CardTitle>
              <CardDescription>Selecione como deseja pagar</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={gateway} onValueChange={(v) => setGateway(v as "stripe" | "mercadopago")}>
                {stripeConfig?.enabled && (
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Cartao de Credito (Stripe)</p>
                          <p className="text-xs text-muted-foreground">Pagamento internacional seguro</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}

                {mercadoPagoConfig?.enabled && (
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="mercadopago" id="mercadopago" />
                    <Label htmlFor="mercadopago" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-5 w-5" />
                        <div>
                          <p className="font-medium">Mercado Pago</p>
                          <p className="text-xs text-muted-foreground">Cartao, Pix, boleto e mais</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com Resumo */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Plano {plan.displayName}</span>
                  <span className="font-medium">{priceFormatted}</span>
                </div>

                {billingCycle === "yearly" && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Desconto anual (17%)</span>
                    <span className="font-medium">
                      -{((plan.monthlyPrice * 12 - plan.yearlyPrice) / 100).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                )}

                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{priceFormatted}/{billingCycle === "monthly" ? "mes" : "ano"}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Assinar Agora"
                )}
              </Button>

              <div className="text-xs text-center text-muted-foreground">
                Voce sera redirecionado para completar o pagamento de forma segura.
                Cancele a qualquer momento.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
