import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, FileText, Users, UserSquare2 } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const { data: tenants } = trpc.tenants.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const stats = [
    {
      title: "Empresas",
      value: tenants?.length || 0,
      icon: Building2,
      description: "Empresas cadastradas",
      visible: user?.role === "admin",
    },
    {
      title: "Setores",
      value: "-",
      icon: UserSquare2,
      description: "Setores ativos",
      visible: true,
    },
    {
      title: "Colaboradores",
      value: "-",
      icon: Users,
      description: "Colaboradores cadastrados",
      visible: true,
    },
    {
      title: "Registros de Auditoria",
      value: "-",
      icon: FileText,
      description: "Últimos 30 dias",
      visible: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo(a) à plataforma Black Belt, {user?.name}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats
            .filter((stat) => stat.visible)
            .map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo à Plataforma</CardTitle>
              <CardDescription>
                Plataforma multi-tenant para gestão de serviços Black Belt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Funcionalidades Principais</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {user?.role === "admin" && (
                    <li>Gestão de empresas clientes (multi-tenant)</li>
                  )}
                  <li>Cadastro de setores e colaboradores</li>
                  <li>Controle de acesso baseado em perfis (RBAC)</li>
                  <li>Auditoria completa de todas as ações</li>
                  <li>Compliance LGPD integrado</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>Status e configurações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Perfil:</span>
                  <span className="font-medium">
                    {user?.role === "admin" ? "Administrador" : "Usuário"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">E-mail:</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Último acesso:</span>
                  <span className="font-medium">
                    {user?.lastSignedIn
                      ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

