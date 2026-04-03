import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Building2, Users, CreditCard, AlertTriangle, Eye, DollarSign, Ticket, ShieldCheck, Mail, MailX, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";

export default function AdminMetricsDashboard() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [search, setSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const overviewQuery = (trpc as any).adminMetrics.overview.useQuery();
  const tenantsQuery = (trpc as any).adminMetrics.tenantsList.useQuery({ search, limit: 50 });
  const alertsQuery = (trpc as any).adminMetrics.alerts.useQuery();
  const usersQuery = (trpc as any).adminMetrics.usersList.useQuery({ search: userSearch, limit: 100 });

  const raw = overviewQuery.data || {};
  const ov = {
    totalTenants: raw.tenants?.total || 0,
    totalUsers: raw.users?.total || 0,
    activeSubscriptions: raw.subscriptions?.active || 0,
    trialingSubscriptions: raw.subscriptions?.trialing || 0,
    canceledSubscriptions: raw.canceledSubscriptions || 0,
    monthlyRevenue: raw.subscriptions?.monthlyRevenue || 0,
    openTickets: raw.tickets?.open || 0,
    churnRate: raw.churnRate || 0,
    conversionRate: raw.conversionRate || 0,
    arr: raw.arr || 0,
    totalReceived: (raw as any).totalReceived || 0,
    paidInvoices: (raw as any).paidInvoices || 0,
    last30DaysRevenue: (raw as any).last30DaysRevenue || 0,
  };
  const tenantsList = tenantsQuery.data || [];
  const alerts = alertsQuery.data || {};
  const usersList = usersQuery.data || [];

  const totalAlerts = (alerts.expiringTrials?.length || 0) + (alerts.pastDue?.length || 0);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">Visão consolidada de todos os tenants</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{ov.totalTenants || 0}</p>
                <p className="text-xs text-muted-foreground">Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{ov.totalUsers || 0}</p>
                <p className="text-xs text-muted-foreground">Usuários</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{ov.activeSubscriptions || 0}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{ov.trialingSubscriptions || 0}</p>
                <p className="text-xs text-muted-foreground">Trial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{ov.canceledSubscriptions || 0}</p>
                <p className="text-xs text-muted-foreground">Canceladas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">R$ {((ov.monthlyRevenue || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Receita mês atual (Asaas)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{ov.openTickets || 0}</p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{ov.churnRate}%</p>
                <p className="text-xs text-muted-foreground">Cancelamentos (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{ov.conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Trial para pago</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">R$ {((ov.totalReceived || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Total recebido (Asaas) — {ov.paidInvoices || 0} pagamento(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" /> Alertas ({totalAlerts})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.expiringTrials?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Trial expirando: <strong>{t.tenantName || t.tenantId}</strong> - {t.daysLeft} dias restantes</span>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/subscriptions")}>Ver</Button>
              </div>
            ))}
            {alerts.pastDue?.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">Pagamento atrasado: <strong>{s.tenantName || s.tenantId}</strong></span>
                <Button size="sm" variant="outline" onClick={() => navigate("/admin/subscriptions")}>Ver</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs: Tenants + Usuários */}
      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">
            <Building2 className="h-4 w-4 mr-2" /> Empresas ({tenantsList.length})
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" /> Usuários ({usersList.length})
          </TabsTrigger>
        </TabsList>

        {/* Tenants Tab */}
        <TabsContent value="tenants">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Tenants</CardTitle>
              <div className="mt-2">
                <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Última Atividade</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantsList.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">{t.cnpj}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>{t.usersCount || 0}</TableCell>
                      <TableCell className="text-sm">{t.lastActivity ? new Date(t.lastActivity).toLocaleDateString("pt-BR") : "N/A"}</TableCell>
                      <TableCell>
                        {t.subscriptionStatus ? (
                          <Badge variant="outline">{t.planName || "N/A"} ({t.subscriptionStatus})</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sem assinatura</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" title="Impersonar" onClick={() => startImpersonation(t.id, t.name)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" title="Assinatura" onClick={() => navigate("/admin/subscriptions")}>
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenantsList.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum tenant encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Usuários</CardTitle>
              <div className="mt-2">
                <Input placeholder="Buscar por nome ou email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="max-w-sm" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Perfis RBAC</TableHead>
                    <TableHead>Email Verificado</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Assinatura</TableHead>
                    <TableHead>Último Acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersList.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className={u.role === "admin" ? "bg-purple-600" : ""}>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          {u.role === "admin" ? "Admin" : u.role === "manager" ? "Gerente" : u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.roles && u.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{r}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {u.emailVerified ? (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            <Mail className="h-3 w-3 mr-1" /> Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            <MailX className="h-3 w-3 mr-1" /> Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{u.tenantName || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {u.subscriptionStatus ? (
                          <Badge variant="outline" className={
                            u.subscriptionStatus === "active" ? "text-green-600 border-green-300" :
                            u.subscriptionStatus === "trialing" ? "text-blue-600 border-blue-300" :
                            "text-gray-600 border-gray-300"
                          }>
                            {u.subscriptionStatus === "active" ? "Ativa" :
                             u.subscriptionStatus === "trialing" ? "Trial" :
                             u.subscriptionStatus}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "Nunca"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {usersList.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}
