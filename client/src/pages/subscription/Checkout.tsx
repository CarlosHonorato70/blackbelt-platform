/**
 * CHECKOUT PAGE
 *
 * Pagamento via Asaas: PIX, Boleto ou Cartão de Crédito.
 * Modelo: Mensalidade fixa + cobranca por convite COPSOQ excedente.
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CreditCard, QrCode, FileText, CheckCircle2, Shield, Sparkles, Copy, ExternalLink, User } from "lucide-react";
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
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [holderName, setHolderName] = useState("");

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

  // Determinar se pede CPF ou CNPJ baseado no plano
  const isStarterPlan = plan?.name?.toLowerCase().includes("starter") || plan?.name?.toLowerCase().includes("básico");
  const docLabel = isStarterPlan ? "CPF" : "CNPJ";
  const docPlaceholder = isStarterPlan ? "000.000.000-00" : "00.000.000/0001-00";
  const docMaxLength = isStarterPlan ? 14 : 18;

  // Formatar CPF/CNPJ enquanto digita
  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (isStarterPlan) {
      // CPF: 000.000.000-00
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
        .substring(0, 14);
    } else {
      // CNPJ: 00.000.000/0001-00
      return digits
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d{1,2})$/, "$1-$2")
        .substring(0, 18);
    }
  };

  const handleCheckout = async () => {
    if (!planId) return;

    // Validar CPF/CNPJ
    const cleanDoc = cpfCnpj.replace(/\D/g, "");
    if (isStarterPlan && cleanDoc.length !== 11) {
      toast({ title: "CPF inválido", description: "Informe um CPF válido com 11 dígitos.", variant: "destructive" });
      return;
    }
    if (!isStarterPlan && cleanDoc.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Informe um CNPJ válido com 14 dígitos.", variant: "destructive" });
      return;
    }
    if (!holderName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome do titular.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await createSubscription.mutateAsync({
        planId,
        billingCycle,
        billingType,
        cpfCnpj: cleanDoc,
        holderName: holderName.trim(),
      });

      setPaymentResult(result);

      // Se cartão de crédito ou não tem QR code, redirecionar para link de pagamento
      if (billingType === "CREDIT_CARD" && result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      toast({
        title: "Cobrança criada!",
        description: billingType === "PIX"
          ? "Escaneie o QR code ou copie o código PIX para pagar"
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
            <CardTitle>Plano não encontrado</CardTitle>
            <CardDescription>O plano selecionado não existe ou não está disponível.</CardDescription>
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
                      Ou copie o código PIX:
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
                    Apos o pagamento, sua assinatura será ativada automaticamente em até 1 minuto.
                  </p>
                </div>
              </div>
            )}

            {/* Boleto */}
            {billingType === "BOLETO" && (
              <div className="flex flex-col items-center gap-4">
                <FileText className="h-16 w-16 text-primary" />
                <p className="text-center text-muted-foreground">
                  Seu boleto foi gerado. Clique no botão abaixo para visualizar e pagar.
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
                      Abrir Página de Pagamento
                    </a>
                  </Button>
                )}

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg w-full text-center">
                  <p className="text-sm text-amber-800">
                    O boleto pode levar até 3 dias úteis para ser compensado.
                    Sua assinatura será ativada automaticamente após a confirmação.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                Ir para o Dashboard
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setPaymentResult(null)}>
                Escolher Outro Método
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
                    Convites COPSOQ inclusos no plano
                  </p>
                </div>
                <p className="text-sm text-amber-700">
                  Cada plano inclui convites COPSOQ na mensalidade. Convites excedentes sao cobrados sob demanda via PIX, cartao ou creditos pre-pagos.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* O que está incluído */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                O que está incluído no plano {plan.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  "SamurAI — Agente de IA para conformidade NR-01",
                  "Cadastro de setores e colaboradores",
                  "Questionário COPSOQ-II com envio por email",
                  "Inventário de riscos psicossociais",
                  "Planos de ação e compliance NR-01",
                  "Exportação de documentos em PDF",
                  "Suporte técnico",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dados do Titular */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Dados do Titular
              </CardTitle>
              <CardDescription>
                {isStarterPlan
                  ? "Informe seu CPF para emissão da cobrança"
                  : "Informe o CNPJ da empresa para emissão da cobrança"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="holderName">Nome {isStarterPlan ? "Completo" : "da Empresa"}</Label>
                <Input
                  id="holderName"
                  placeholder={isStarterPlan ? "Nome completo do titular" : "Razão social da empresa"}
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cpfCnpj">{docLabel}</Label>
                <Input
                  id="cpfCnpj"
                  placeholder={docPlaceholder}
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  maxLength={docMaxLength}
                  className="mt-1 font-mono"
                />
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
                        <p className="text-xs text-muted-foreground">Pagamento instantâneo — aprovação imediata</p>
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
                        <p className="text-xs text-muted-foreground">Compensação em até 3 dias úteis</p>
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
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-xs text-muted-foreground">Pagamento seguro — aprovação imediata</p>
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

                {plan.copsoqInvitesIncluded > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{plan.copsoqInvitesIncluded} convites COPSOQ inclusos</span>
                    <span>+ R$ {(plan.pricePerCopsoqInvite / 100).toFixed(2)}/excedente</span>
                  </div>
                )}

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
                  Sistema de pagamento indisponível no momento.
                </p>
              )}

              <div className="text-xs text-center text-muted-foreground">
                {billingType === "PIX"
                  ? "Você receberá um QR code para pagamento instantâneo."
                  : billingType === "BOLETO"
                    ? "Um boleto será gerado para pagamento."
                    : "Você será redirecionado para completar o pagamento."}
                <br />Cancele a qualquer momento.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
