/**
 * SUBSCRIPTION DASHBOARD
 *
 * Dashboard para gerenciar assinatura, ver uso e faturas
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Users,
  HardDrive,
  Activity,
  Calendar,
  Download,
  AlertTriangle,
  QrCode,
  FileText,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SubscriptionDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Buscar dados
  const { data: subscriptionData, isLoading } = trpc.subscriptions.getCurrentSubscription.useQuery();
  const { data: limitsData } = trpc.subscriptions.checkLimits.useQuery();
  const subscription = subscriptionData?.subscription;
  const plan = subscriptionData?.plan;
  const limits = limitsData;
  const { data: invoices } = trpc.subscriptions.listInvoices.useQuery({ limit: 10 });
  const { data: asaasDetails } = trpc.asaas.getSubscriptionDetails.useQuery();

  // Mutations
  const cancelSubscription = trpc.subscriptions.cancelSubscription.useMutation();
  const reactivateSubscription = trpc.subscriptions.reactivateSubscription.useMutation();
  const cancelAsaas = trpc.asaas.cancelSubscription.useMutation();

  const handleCancelSubscription = async () => {
    try {
      // Cancelar no Asaas + local
      try { await cancelAsaas.mutateAsync(); } catch {}
      await cancelSubscription.mutateAsync();
      toast({
        title: "Assinatura cancelada",
        description: "Voce continuara tendo acesso ate o final do periodo pago.",
      });
      setShowCancelDialog(false);
    } catch (error) {
      toast({
        title: "Erro ao cancelar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateSubscription.mutateAsync();
      toast({
        title: "Assinatura reativada",
        description: "Sua assinatura foi reativada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro ao reativar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Assinatura Ativa</CardTitle>
            <CardDescription>
              Voce precisa de uma assinatura para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/pricing")}>
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Aguardando Pagamento", color: "bg-amber-500" },
    active: { label: "Ativa", color: "bg-green-500" },
    past_due: { label: "Pagamento Pendente", color: "bg-yellow-500" },
    canceled: { label: "Cancelada", color: "bg-red-500" },
    unpaid: { label: "Nao Paga", color: "bg-red-500" },
  };

  const status = statusMap[subscription?.status ?? ""] || { label: subscription?.status ?? "-", color: "bg-gray-500" };

  const billingTypeIcon = (type?: string) => {
    switch (type) {
      case "PIX": return <QrCode className="h-4 w-4 text-green-600" />;
      case "BOLETO": return <FileText className="h-4 w-4 text-blue-600" />;
      case "CREDIT_CARD": return <CreditCard className="h-4 w-4 text-purple-600" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Minha Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e acompanhe o uso
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList>
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="invoices">Faturas</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plano {plan?.displayName}</CardTitle>
                  <CardDescription>
                    {subscription?.billingCycle === "monthly" ? "Mensal" : "Anual"}
                  </CardDescription>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Proxima Cobranca</p>
                  <p className="text-lg font-semibold">
                    {asaasDetails?.nextDueDate
                      ? new Date(asaasDetails.nextDueDate).toLocaleDateString("pt-BR")
                      : subscription?.currentPeriodEnd
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                        : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-lg font-semibold">
                    {(((subscription?.billingCycle === "monthly"
                      ? plan?.monthlyPrice
                      : plan?.yearlyPrice) ?? 0) / 100 || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Forma de Pagamento</p>
                  <div className="flex items-center gap-2">
                    {billingTypeIcon(asaasDetails?.billingType)}
                    <p className="text-lg font-semibold">
                      {asaasDetails?.billingType === "PIX" ? "PIX" :
                       asaasDetails?.billingType === "BOLETO" ? "Boleto" :
                       asaasDetails?.billingType === "CREDIT_CARD" ? "Cartao" : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {subscription?.status === "pending" && (
                <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Aguardando confirmacao do pagamento. Sua assinatura sera ativada automaticamente.
                  </p>
                </div>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Assinatura sera cancelada
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Voce tera acesso ate {subscription?.currentPeriodEnd
                          ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {!subscription?.cancelAtPeriodEnd ? (
                  <>
                    <Button variant="outline" onClick={() => navigate("/pricing")}>
                      Mudar Plano
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      Cancelar Assinatura
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleReactivate}>
                    Reativar Assinatura
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle>Recursos do Plano</CardTitle>
              <CardDescription>O que esta incluido no seu plano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Users, label: "Usuarios", value: plan?.maxUsersPerTenant === -1 ? "Ilimitados" : plan?.maxUsersPerTenant },
                  { icon: HardDrive, label: "Armazenamento", value: plan?.maxStorageGB === -1 ? "Ilimitado" : `${plan?.maxStorageGB} GB` },
                  { icon: Activity, label: "API", value: plan?.hasApiAccess ? "Incluida" : "Nao incluida" },
                  { icon: Calendar, label: "Relatorios Avancados", value: plan?.hasAdvancedReports ? "Sim" : "Basicos" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Uso Atual</CardTitle>
              <CardDescription>Acompanhe o consumo dos recursos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {limits && (
                <>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Usuarios</span>
                      <span className="text-sm text-muted-foreground">
                        {limits.usage.activeUsers} / {limits.limits.maxUsersPerTenant === -1 ? "\u221e" : limits.limits.maxUsersPerTenant}
                      </span>
                    </div>
                    {limits.limits.maxUsersPerTenant !== -1 && (
                      <Progress
                        value={(limits.usage.activeUsers / limits.limits.maxUsersPerTenant) * 100}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Armazenamento</span>
                      <span className="text-sm text-muted-foreground">
                        {(limits.usage.storageUsedGB / 100).toFixed(2)} GB / {limits.limits.maxStorageGB === -1 ? "\u221e" : `${limits.limits.maxStorageGB} GB`}
                      </span>
                    </div>
                    {limits.limits.maxStorageGB !== -1 && (
                      <Progress
                        value={((limits.usage.storageUsedGB / 100) / limits.limits.maxStorageGB) * 100}
                      />
                    )}
                  </div>

                  {limits.limits.maxApiRequestsPerDay !== 0 && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Requisicoes API (hoje)</span>
                        <span className="text-sm text-muted-foreground">
                          {limits.usage.apiRequests} / {limits.limits.maxApiRequestsPerDay === -1 ? "\u221e" : limits.limits.maxApiRequestsPerDay}
                        </span>
                      </div>
                      {limits.limits.maxApiRequestsPerDay !== -1 && (
                        <Progress
                          value={(limits.usage.apiRequests / limits.limits.maxApiRequestsPerDay) * 100}
                        />
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historico de Faturas</CardTitle>
              <CardDescription>Todas as suas faturas e pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => (
                    <div key={invoice.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">
                          {new Date(invoice.createdAt!).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.description || "Assinatura"}
                        </p>
                        {invoice.paymentMethod && (
                          <div className="flex items-center gap-1 mt-1">
                            {billingTypeIcon(invoice.paymentMethod)}
                            <span className="text-xs text-muted-foreground">{invoice.paymentMethod}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">
                            {(invoice.total / 100).toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                          <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                            {invoice.status === "paid" ? "Pago" :
                             invoice.status === "void" ? "Reembolsado" :
                             invoice.status}
                          </Badge>
                        </div>
                        {invoice.invoiceUrl && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma fatura ainda
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Voce continuara tendo acesso ate o final do periodo pago.
              Apos isso, sua conta sera desativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nao, manter assinatura</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
