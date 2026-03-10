import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Building2, Users, CreditCard, AlertTriangle, Eye, DollarSign, Ticket } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminMetricsDashboard() {
  const navigate = useNavigate();
  const { startImpersonation } = useImpersonation();
  const [search, setSearch] = useState("");

  const overviewQuery = (trpc as any).adminMetrics.overview.useQuery();
  const tenantsQuery = (trpc as any).adminMetrics.tenantsList.useQuery({ search, limit: 50 });
  const alertsQuery = (trpc as any).adminMetrics.alerts.useQuery();

  const raw = overviewQuery.data || {};
  const ov = {
    totalTenants: raw.tenants?.total || 0,
    totalUsers: raw.users?.total || 0,
    activeSubscriptions: raw.subscriptions?.active || 0,
    trialingSubscriptions: raw.subscriptions?.trialing || 0,
    canceledSubscriptions: raw.subscriptions?.canceled || 0,
    monthlyRevenue: raw.subscriptions?.monthlyRevenue || 0,
    openTickets: raw.tickets?.open || 0,
  };
  const tenantsList = tenantsQuery.data || [];
  const alerts = alertsQuery.data || {};

  const totalAlerts = (alerts.expiringTrials?.length || 0) + (alerts.pastDue?.length || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
        <p className="text-muted-foreground">Visão consolidada de todos os tenants</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                <p className="text-2xl font-bold">R$ {((ov.monthlyRevenue || 0) / 100).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Receita/mês</p>
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

      {/* Tenants Table */}
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
    </div>
  );
}
