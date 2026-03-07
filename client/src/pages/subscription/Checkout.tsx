/**
 * CHECKOUT PAGE
 * 
 * Página de checkout para iniciar assinatura
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [gateway, setGateway] = useState<"stripe" | "mercadopago">("stripe");
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

  // Mutations
  const createStripeCheckout = trpc.stripe.createCheckoutSession.useMutation();
  const createMercadoPagoPreference = trpc.mercadoPago.createPreference.useMutation();

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
            <Button onClick={() => navigate("/pricing")}>
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

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Finalizar Assinatura</h1>
        <p className="text-muted-foreground">
          Complete os detalhes para iniciar seu período de teste
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Resumo do Pedido */}
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

              {plan.trialDays > 0 && (
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-sm font-medium">
                    🎁 {plan.trialDays} dias de teste grátis
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você não será cobrado até {new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gateway de Pagamento */}
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
                  <span>{priceFormatted}</span>
                </div>

                {plan.trialDays > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Hoje: R$ 0,00 (teste grátis)
                  </div>
                )}
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
                  `Iniciar ${plan.trialDays} Dias Grátis`
                )}
              </Button>

              <div className="text-xs text-center text-muted-foreground">
                Você será redirecionado para completar o pagamento de forma segura
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
