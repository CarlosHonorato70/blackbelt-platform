import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Lock,
  MoreVertical,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export default function RolesPermissions() {
  const { selectedTenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para gerenciar perfis e permissões
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Mock data - será substituído por dados reais do backend
  const roles = [
    {
      id: "1",
      name: "Administrador",
      description: "Acesso total à plataforma",
      type: "sistema",
      users: 1,
      permissions: [
        "criar_avaliacao",
        "editar_avaliacao",
        "deletar_avaliacao",
        "visualizar_relatorios",
        "exportar_dados",
        "gerenciar_usuarios",
        "gerenciar_roles",
        "acessar_auditoria",
      ],
    },
    {
      id: "2",
      name: "Gestor",
      description: "Gestão de avaliações e equipe",
      type: "customizado",
      users: 2,
      permissions: [
        "criar_avaliacao",
        "editar_avaliacao",
        "visualizar_relatorios",
        "gerenciar_usuarios",
      ],
    },
    {
      id: "3",
      name: "Avaliador",
      description: "Realização de avaliações",
      type: "customizado",
      users: 1,
      permissions: [
        "criar_avaliacao",
        "editar_avaliacao",
        "visualizar_relatorios",
      ],
    },
    {
      id: "4",
      name: "Colaborador",
      description: "Visualização de resultados",
      type: "customizado",
      users: 5,
      permissions: ["visualizar_relatorios"],
    },
  ];

  const allPermissions = [
    {
      id: "criar_avaliacao",
      name: "Criar Avaliação",
      description: "Criar novas avaliações de riscos psicossociais",
      category: "Avaliações",
    },
    {
      id: "editar_avaliacao",
      name: "Editar Avaliação",
      description: "Editar avaliações existentes",
      category: "Avaliações",
    },
    {
      id: "deletar_avaliacao",
      name: "Deletar Avaliação",
      description: "Remover avaliações do sistema",
      category: "Avaliações",
    },
    {
      id: "visualizar_relatorios",
      name: "Visualizar Relatórios",
      description: "Acessar relatórios de compliance",
      category: "Relatórios",
    },
    {
      id: "exportar_dados",
      name: "Exportar Dados",
      description: "Exportar dados em PDF, Excel, etc.",
      category: "Dados",
    },
    {
      id: "gerenciar_usuarios",
      name: "Gerenciar Usuários",
      description: "Convidar e gerenciar usuários",
      category: "Administração",
    },
    {
      id: "gerenciar_roles",
      name: "Gerenciar Roles",
      description: "Criar e editar perfis de acesso",
      category: "Administração",
    },
    {
      id: "acessar_auditoria",
      name: "Acessar Auditoria",
      description: "Visualizar logs de auditoria",
      category: "Segurança",
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrar com tRPC para criar/editar role
    console.log("Role salvo:", formData);
    setFormData({ name: "", description: "" });
    setDialogOpen(false);
  };

  const getPermissionsByCategory = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return {};

    const grouped: Record<string, any[]> = {};
    allPermissions.forEach((perm) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push({
        ...perm,
        enabled: role.permissions.includes(perm.id),
      });
    });
    return grouped;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Perfis e Permissões
            </h1>
            <p className="text-muted-foreground">
              Gerencie roles e controle de acesso - {typeof selectedTenant === 'string' ? selectedTenant : selectedTenant?.name}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Perfil</DialogTitle>
                <DialogDescription>
                  Defina um novo perfil de acesso customizado
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Perfil *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Supervisor"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <textarea
                    id="description"
                    name="description"
                    placeholder="Descreva o propósito deste perfil..."
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Perfil</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Perfis */}
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{role.name}</CardTitle>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          role.type === "sistema"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {role.type === "sistema" ? "Sistema" : "Customizado"}
                      </span>
                    </div>
                    <CardDescription>{role.description}</CardDescription>
                  </div>

                  {role.type !== "sistema" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSelectedRole(role.id)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Informações do Perfil */}
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Usuários com este perfil</p>
                    <p className="font-semibold">{role.users}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Permissões</p>
                    <p className="font-semibold">{role.permissions.length}</p>
                  </div>
                </div>

                {/* Permissões */}
                <div className="space-y-3 border-t pt-4">
                  <p className="font-semibold text-sm">Permissões Atribuídas</p>
                  <div className="space-y-2">
                    {Object.entries(getPermissionsByCategory(role.id)).map(
                      ([category, perms]) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            {category}
                          </p>
                          <div className="space-y-1 ml-2">
                            {(perms as any[]).map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                {perm.enabled ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-gray-300" />
                                )}
                                <span
                                  className={
                                    perm.enabled
                                      ? "text-foreground"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {perm.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Informações sobre Controle de Acesso */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Controle de Acesso Baseado em Roles (RBAC)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              • Cada usuário tem um perfil que define suas permissões na plataforma
            </p>
            <p>
              • Perfis de sistema (Administrador) não podem ser deletados
            </p>
            <p>
              • Perfis customizados podem ser criados e editados conforme necessário
            </p>
            <p>
              • As permissões são verificadas em tempo real para cada ação
            </p>
            <p>
              • Todas as mudanças de perfil são registradas na auditoria
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

