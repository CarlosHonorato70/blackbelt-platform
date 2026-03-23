/**
 * CHECKOUT PAGE
 *
 * Pagamento via Asaas: PIX, Boleto ou Cartão de Crédito.
 * Modelo: 1 empresa grátis para sempre. Para mais empresas, assinar plano.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, QrCode, FileText, CheckCircle2, Shield, Sparkles, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [planId, setPlanId] = useState<string>("");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

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

  // Verificar se Asaas está habilitado
  const { data: asaasConfig } = trpc.asaas.isEnabled.useQuery();

  // Mutation para criar assinatura
  const createSubscription = trpc.asaas.createSubscription.useMutation();

  const handleCheckout = async () => {
    if (!planId) return;
    setIsProcessing(true);

    try {
      const result = await createSubscription.mutateAsync({
        planId,
        billingCycle,
        billingType,
      });

      setPaymentResult(result);

      // Se cartão de crédito ou não tem QR code, redirecionar para link de pagamento
      if (billingType === "CREDIT_CARD" && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      toast({
        title: "Cobranca criada!",
        description: billingType === "PIX"
          ? "Escaneie o QR code ou copie o codigo PIX para pagar"
          : "Seu boleto foi gerado. Pague ate o vencimento para ativar.",
      });
    } catch (error) {
      toast({
        title: "Erro ao processar pagamento",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPix = () => {
    if (paymentResult?.pixCopiaECola) {
      navigator.clipboard.writeText(paymentResult.pixCopiaECola);
      toast({ title: "Codigo PIX copiado!" });
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
            <Button onClick={() => navigate("/pricing")}>Voltar para Planos</Button>
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

  // Se já tem resultado do pagamento, mostrar tela de pagamento
  if (paymentResult) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {billingType === "PIX" ? "Pague com PIX" : "Boleto Gerado"}
            </CardTitle>
            <CardDescription>
              Plano {plan.displayName} — {priceFormatted}/{billingCycle === "monthly" ? "mes" : "ano"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code PIX */}
            {billingType === "PIX" && paymentResult.pixQrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <img
                    src={`data:image/png;base64,${paymentResult.pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                </div>

                {paymentResult.pixCopiaECola && (
                  <div className="w-full">
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                      Ou copie o codigo PIX:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={paymentResult.pixCopiaECola}
                        className="flex-1 text-xs bg-muted p-3 rounded-lg font-mono truncate"
                      />
                      <Button variant="outline" size="sm" onClick={handleCopyPix}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg w-full text-center">
                  <p className="text-sm text-green-800">
                    Apos o pagamento, sua assinatura sera ativada automaticamente em ate 1 minuto.
                  </p>
                </div>
              </div>
            )}

            {/* Boleto */}
            {billingType === "BOLETO" && (
              <div className="flex flex-col items-center gap-4">
                <FileText className="h-16 w-16 text-primary" />
                <p className="text-center text-muted-foreground">
                  Seu boleto foi gerado. Clique no botao abaixo para visualizar e pagar.
                </p>

                {paymentResult.bankSlipUrl && (
                  <Button asChild size="lg" className="w-full">
                    <a href={paymentResult.bankSlipUrl} target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-5 w-5" />
                      Visualizar Boleto
                    </a>
                  </Button>
                )}

                {paymentResult.paymentUrl && (
                  <Button variant="outline" asChild className="w-full">
                    <a href={paymentResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir Pagina de Pagamento
                    </a>
                  </Button>
                )}

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg w-full text-center">
                  <p className="text-sm text-amber-800">
                    O boleto pode levar ate 3 dias uteis para ser compensado.
                    Sua assinatura sera ativada automaticamente apos a confirmacao.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                Ir para o Dashboard
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPaymentResult(null)}>
                Escolher Outro Metodo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

          {/* Forma de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Forma de Pagamento</CardTitle>
              <CardDescription>Selecione como deseja pagar</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={billingType}
                onValueChange={(v) => setBillingType(v as "PIX" | "BOLETO" | "CREDIT_CARD")}
                className="space-y-3"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="PIX" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <QrCode className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">PIX</p>
                        <p className="text-xs text-muted-foreground">Pagamento instantaneo — aprovacao imediata</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="BOLETO" id="boleto" />
                  <Label htmlFor="boleto" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Boleto Bancario</p>
                        <p className="text-xs text-muted-foreground">Compensacao em ate 3 dias uteis</p>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="CREDIT_CARD" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Cartao de Credito</p>
                        <p className="text-xs text-muted-foreground">Pagamento seguro — aprovacao imediata</p>
                      </div>
                    </div>
                  </Label>
                </div>
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
                disabled={isProcessing || !asaasConfig?.enabled}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {billingType === "PIX" && <QrCode className="mr-2 h-4 w-4" />}
                    {billingType === "BOLETO" && <FileText className="mr-2 h-4 w-4" />}
                    {billingType === "CREDIT_CARD" && <CreditCard className="mr-2 h-4 w-4" />}
                    Assinar Agora
                  </>
                )}
              </Button>

              {!asaasConfig?.enabled && (
                <p className="text-xs text-center text-destructive">
                  Sistema de pagamento indisponivel no momento.
                </p>
              )}

              <div className="text-xs text-center text-muted-foreground">
                {billingType === "PIX"
                  ? "Voce recebera um QR code para pagamento instantaneo."
                  : billingType === "BOLETO"
                    ? "Um boleto sera gerado para pagamento."
                    : "Voce sera redirecionado para completar o pagamento."}
                <br />Cancele a qualquer momento.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
