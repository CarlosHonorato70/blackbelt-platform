/**
 * CHECKOUT PAGE
 *
 * Página de checkout para iniciar assinatura.
 * Se o plano tem trial, inicia direto sem pagamento.
 * Se não tem trial, redireciona para gateway de pagamento.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Smartphone, Gift, CheckCircle2, Shield } from "lucide-react";
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
  const createTrialSubscription = trpc.subscriptions.createTrialSubscription.useMutation();

  const hasTrial = plan && plan.trialDays > 0;

  // Handler para iniciar trial gratuito (sem pagamento)
  const handleStartTrial = async () => {
    if (!planId) return;

    setIsProcessing(true);

    try {
      await createTrialSubscription.mutateAsync({
        planId,
        billingCycle,
      });

      toast({
        title: "Trial ativado com sucesso!",
        description: `Você tem ${plan?.trialDays} dias grátis para explorar a plataforma.`,
      });

      // Redirecionar para o dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      toast({
        title: "Erro ao iniciar período de teste",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

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

        if (result.url) {
          window.location.href = result.url;
        }
      } else {
        const result = await createMercadoPagoPreference.mutateAsync({
          planId,
          billingCycle,
          successUrl,
          failureUrl: `${window.location.origin}/subscription/failure`,
          pendingUrl: `${window.location.origin}/subscription/pending`,
        });

        if (result.initPoint) {
          window.location.href = result.initPoint;
        }
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
            <CardTitle>Plano não encontrado</CardTitle>
            <CardDescription>
              O plano selecionado não existe ou não está disponível.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/subscription/pricing")}>
              Voltar para Planos
            </Button>
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

  const trialEndDate = new Date(Date.now() + (plan.trialDays || 0) * 24 * 60 * 60 * 1000);

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {hasTrial ? "Iniciar Período de Teste" : "Finalizar Assinatura"}
        </h1>
        <p className="text-muted-foreground">
          {hasTrial
            ? `Teste grátis por ${plan.trialDays} dias — sem cartão de crédito`
            : "Complete os detalhes para ativar seu plano"}
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
                    /{billingCycle === "monthly" ? "mês" : "ano"}
                  </p>
                </div>
              </div>

              {hasTrial && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <p className="font-semibold text-green-800">
                      {plan.trialDays} dias de teste grátis
                    </p>
                  </div>
                  <p className="text-sm text-green-700">
                    Acesso completo a todas as funcionalidades até {trialEndDate.toLocaleDateString("pt-BR")}.
                    Nenhum pagamento será cobrado durante o período de teste.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Benefícios do Trial */}
          {hasTrial && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  O que está incluído no teste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {[
                    "Acesso completo a todas as funcionalidades do plano",
                    "Cadastro de setores e colaboradores",
                    "Aplicação do questionário COPSOQ II",
                    "Relatórios de risco psicossocial",
                    "Planos de ação e compliance NR-01",
                    "Suporte técnico completo",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Sem necessidade de cartão de crédito. Cancele a qualquer momento.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Gateway de Pagamento — só mostra se NÃO tem trial */}
          {!hasTrial && (
            <Card>
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
                <CardDescription>
                  Selecione como deseja pagar
                </CardDescription>
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
                            <p className="font-medium">Cartão de Crédito (Stripe)</p>
                            <p className="text-xs text-muted-foreground">
                              Pagamento internacional seguro
                            </p>
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
                            <p className="text-xs text-muted-foreground">
                              Cartão, Pix, boleto e mais
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  )}
                </RadioGroup>
              </CardContent>
            </Card>
          )}
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

                {hasTrial ? (
                  <>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Hoje</span>
                      <span className="text-green-600">R$ 0,00</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Após o teste: {priceFormatted}/{billingCycle === "monthly" ? "mês" : "ano"}
                    </div>
                  </>
                ) : (
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{priceFormatted}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={hasTrial ? handleStartTrial : handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : hasTrial ? (
                  <>
                    <Gift className="mr-2 h-4 w-4" />
                    Iniciar {plan.trialDays} Dias Grátis
                  </>
                ) : (
                  "Assinar Agora"
                )}
              </Button>

              <div className="text-xs text-center text-muted-foreground">
                {hasTrial
                  ? "Sem cartão de crédito. Cancele quando quiser."
                  : "Você será redirecionado para completar o pagamento de forma segura"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
