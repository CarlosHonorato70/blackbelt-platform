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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertCircle,
  Copy,
  Loader2,
  Mail,
  MoreVertical,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusMap: Record<string, string> = {
  pending: "pendente",
  accepted: "aceito",
  expired: "expirado",
  cancelled: "cancelado",
};

function formatStatus(status: string): string {
  return statusMap[status] || status;
}

function getExpiresIn(expiresAt: Date | string | null): string {
  if (!expiresAt) return "—";
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return "Expirado";
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days === 1 ? "1 dia" : `${days} dias`;
}

export default function UserInvites() {
  const { selectedTenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    roleId: "",
    message: "",
  });
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  const tenantId =
    typeof selectedTenant === "string"
      ? selectedTenant
      : selectedTenant?.id || "";

  // tRPC queries
  const { data: invites = [], isLoading, refetch } =
    trpc.userInvites.list.useQuery(
      { tenantId },
      { enabled: !!tenantId }
    );

  const { data: availableRoles = [] } =
    trpc.rolesPermissions.roles.list.useQuery(
      {},
      { enabled: !!selectedTenant }
    );

  // tRPC mutations
  const createMutation = trpc.userInvites.create.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!", {
        description: "O convite foi registrado.",
      });
      setFormData({ email: "", roleId: "", message: "" });
      setDialogOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao enviar convite", { description: err.message });
    },
  });

  const resendMutation = trpc.userInvites.resend.useMutation({
    onSuccess: () => {
      toast.success("Convite reenviado!");
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao reenviar convite", { description: err.message });
    },
  });

  const cancelMutation = trpc.userInvites.cancel.useMutation({
    onSuccess: () => {
      toast.success("Convite cancelado!");
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao cancelar convite", { description: err.message });
    },
  });

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para gerenciar convites de usuários
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, roleId: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      tenantId,
      email: formData.email,
      roleId: formData.roleId,
      expiresInDays: 7,
    });
  };

  const copyToClipboard = (token: string, id: string) => {
    const inviteLink = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(id);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  const getRoleName = (roleId: string): string => {
    const role = availableRoles.find(r => r.id === roleId);
    return role?.displayName || roleId;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "accepted":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "expired":
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Convites de Usuários
            </h1>
            <p className="text-muted-foreground">
              Gerencie convites para colaboradores -{" "}
              {typeof selectedTenant === "string"
                ? selectedTenant
                : selectedTenant?.name}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Enviar Convite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar Convite de Usuário</DialogTitle>
                <DialogDescription>
                  Convide um novo usuário para colaborar na plataforma
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail do Usuário *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="usuario@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Perfil/Função *</Label>
                  <Select
                    value={formData.roleId}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    Mensagem Personalizada (Opcional)
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Adicione uma mensagem pessoal ao convite..."
                    rows={3}
                    value={formData.message}
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
                  <Button type="submit" disabled={createMutation.isPending || !formData.roleId}>
                    {createMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Enviar Convite
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* Resumo de Convites */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Total de Convites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{invites.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enviados nesta empresa
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-yellow-600">
                    {invites.filter(i => i.status === "pending").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aguardando aceitar
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {invites.filter(i => i.status === "accepted").length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Usuários ativos
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Convites */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Convites</CardTitle>
                <CardDescription>
                  Gerencie convites enviados e acompanhe status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Nenhum convite enviado</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Envie seu primeiro convite clicando em "Enviar Convite"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {invites.map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div>
                              <h4 className="font-semibold">{invite.email}</h4>
                              <p className="text-sm text-muted-foreground">
                                Perfil: {getRoleName(invite.roleId)} • Enviado em{" "}
                                {invite.createdAt
                                  ? new Date(invite.createdAt).toLocaleDateString("pt-BR")
                                  : "—"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end mb-2">
                              {getStatusIcon(invite.status)}
                              <span
                                className={`text-xs px-2 py-1 rounded ${getStatusColor(
                                  invite.status
                                )}`}
                              >
                                {formatStatus(invite.status)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {invite.status === "accepted"
                                ? "Aceito"
                                : `Expira em ${getExpiresIn(invite.expiresAt)}`}
                            </p>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  copyToClipboard(invite.token, invite.id)
                                }
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                {copiedInvite === invite.id
                                  ? "Copiado!"
                                  : "Copiar Link"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  resendMutation.mutate({ id: invite.id })
                                }
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Reenviar Convite
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  if (window.confirm(`Tem certeza que deseja cancelar o convite para ${invite.email}?`)) {
                                    cancelMutation.mutate({ id: invite.id });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Cancelar Convite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Informações sobre Convites */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              Como Funcionam os Convites
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>• Os convites expiram em 7 dias se não forem aceitos</p>
            <p>
              • O usuário receberá um e-mail com um link único para ativar sua
              conta
            </p>
            <p>
              • Você pode reenviar convites expirados ou cancelar convites
              pendentes
            </p>
            <p>• Cada perfil tem permissões específicas na plataforma</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
