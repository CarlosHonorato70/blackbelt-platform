/**
 * SUBSCRIPTION DASHBOARD
 * 
 * Dashboard para gerenciar assinatura, ver uso e faturas
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, 
  CreditCard, 
  Users, 
  HardDrive, 
  Activity, 
  Calendar,
  Download,
  ExternalLink,
  AlertTriangle
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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Buscar dados
  const { data: subscription, isLoading } = trpc.subscriptions.getCurrentSubscription.useQuery();
  const { data: limits } = trpc.subscriptions.checkLimits.useQuery();
  const { data: invoices } = trpc.subscriptions.listInvoices.useQuery({ limit: 10 });
  
  // Mutations
  const cancelSubscription = trpc.subscriptions.cancelSubscription.useMutation();
  const reactivateSubscription = trpc.subscriptions.reactivateSubscription.useMutation();
  const createPortal = trpc.stripe.createCustomerPortal.useMutation();

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      toast({
        title: "Assinatura cancelada",
        description: "Você continuará tendo acesso até o final do período pago.",
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

  const handleManagePayment = async () => {
    try {
      const result = await createPortal.mutateAsync({
        returnUrl: window.location.href,
      });
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível abrir o portal de pagamento",
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

  if (!subscription) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Assinatura Ativa</CardTitle>
            <CardDescription>
              Você precisa de uma assinatura para acessar a plataforma
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

  const statusMap = {
    trialing: { label: "Em Trial", color: "bg-blue-500" },
    active: { label: "Ativa", color: "bg-green-500" },
    past_due: { label: "Pagamento Pendente", color: "bg-yellow-500" },
    canceled: { label: "Cancelada", color: "bg-red-500" },
    unpaid: { label: "Não Paga", color: "bg-red-500" },
  };

  const status = statusMap[subscription.status] || { label: subscription.status, color: "bg-gray-500" };

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
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
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
                  <CardTitle>Plano {subscription.plan?.displayName}</CardTitle>
                  <CardDescription>
                    {subscription.billingCycle === "monthly" ? "Mensal" : "Anual"}
                  </CardDescription>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
                  <p className="text-lg font-semibold">
                    {subscription.currentPeriodEnd 
                      ? new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-lg font-semibold">
                    {((subscription.billingCycle === "monthly" 
                      ? subscription.plan?.monthlyPrice 
                      : subscription.plan?.yearlyPrice) / 100 || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              </div>

              {subscription.status === "trialing" && subscription.trialEnd && (
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <p className="text-sm font-medium">
                    🎁 Trial expira em {new Date(subscription.trialEnd).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione um método de pagamento antes do fim do trial
                  </p>
                </div>
              )}

              {subscription.cancelAtPeriodEnd && (
                <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Assinatura será cancelada
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Você terá acesso até {new Date(subscription.currentPeriodEnd!).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {!subscription.cancelAtPeriodEnd ? (
                  <>
                    <Button variant="outline" onClick={handleManagePayment}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Gerenciar Pagamento
                    </Button>
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
              <CardDescription>O que está incluído no seu plano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Users, label: "Usuários", value: subscription.plan?.maxUsersPerTenant === -1 ? "Ilimitados" : subscription.plan?.maxUsersPerTenant },
                  { icon: HardDrive, label: "Armazenamento", value: subscription.plan?.maxStorageGB === -1 ? "Ilimitado" : `${subscription.plan?.maxStorageGB} GB` },
                  { icon: Activity, label: "API", value: subscription.plan?.hasApiAccess ? "Incluída" : "Não incluída" },
                  { icon: Calendar, label: "Relatórios Avançados", value: subscription.plan?.hasAdvancedReports ? "Sim" : "Básicos" },
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
                  {/* Users */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Usuários</span>
                      <span className="text-sm text-muted-foreground">
                        {limits.currentUsage.activeUsers} / {limits.plan.maxUsersPerTenant === -1 ? "∞" : limits.plan.maxUsersPerTenant}
                      </span>
                    </div>
                    {limits.plan.maxUsersPerTenant !== -1 && (
                      <Progress 
                        value={(limits.currentUsage.activeUsers / limits.plan.maxUsersPerTenant) * 100} 
                      />
                    )}
                  </div>

                  {/* Storage */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Armazenamento</span>
                      <span className="text-sm text-muted-foreground">
                        {(limits.currentUsage.storageUsedGB / 100).toFixed(2)} GB / {limits.plan.maxStorageGB === -1 ? "∞" : `${limits.plan.maxStorageGB} GB`}
                      </span>
                    </div>
                    {limits.plan.maxStorageGB !== -1 && (
                      <Progress 
                        value={((limits.currentUsage.storageUsedGB / 100) / limits.plan.maxStorageGB) * 100} 
                      />
                    )}
                  </div>

                  {/* API Requests */}
                  {limits.plan.hasApiAccess && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Requisições API (hoje)</span>
                        <span className="text-sm text-muted-foreground">
                          {limits.currentUsage.apiRequests} / {limits.plan.maxApiRequestsPerDay === -1 ? "∞" : limits.plan.maxApiRequestsPerDay}
                        </span>
                      </div>
                      {limits.plan.maxApiRequestsPerDay !== -1 && (
                        <Progress 
                          value={(limits.currentUsage.apiRequests / limits.plan.maxApiRequestsPerDay) * 100} 
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
              <CardTitle>Histórico de Faturas</CardTitle>
              <CardDescription>Todas as suas faturas e pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">
                          {new Date(invoice.createdAt!).toLocaleDateString("pt-BR")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.description || "Assinatura"}
                        </p>
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
                            {invoice.status === "paid" ? "Pago" : invoice.status}
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
              Você continuará tendo acesso até o final do período pago. 
              Após isso, sua conta será desativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter assinatura</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSubscription} className="bg-destructive text-destructive-foreground">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
