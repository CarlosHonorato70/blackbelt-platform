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
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertCircle,
  Copy,
  Mail,
  MoreVertical,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { useState } from "react";

export default function UserInvites() {
  const { selectedTenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    role: "user",
    message: "",
  });
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

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

  // Mock data - será substituído por dados reais do backend
  const invites = [
    {
      id: "1",
      email: "joao.silva@example.com",
      role: "gestor",
      status: "pendente",
      sentDate: "20/10/2025",
      expiresIn: "5 dias",
      inviteLink: "https://blackbeltmgmt.com/invite/abc123def456",
    },
    {
      id: "2",
      email: "maria.santos@example.com",
      role: "colaborador",
      status: "aceito",
      sentDate: "18/10/2025",
      expiresIn: "Expirado",
      inviteLink: "https://blackbeltmgmt.com/invite/ghi789jkl012",
    },
    {
      id: "3",
      email: "pedro.oliveira@example.com",
      role: "avaliador",
      status: "pendente",
      sentDate: "15/10/2025",
      expiresIn: "2 dias",
      inviteLink: "https://blackbeltmgmt.com/invite/mno345pqr678",
    },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrar com tRPC para enviar convite
    console.log("Convite enviado:", formData);
    setFormData({ email: "", role: "user", message: "" });
    setDialogOpen(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedInvite(id);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aceito":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "pendente":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "expirado":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aceito":
        return "bg-green-100 text-green-800";
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      case "expirado":
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
                    value={formData.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                      <SelectItem value="gestor">Gestor</SelectItem>
                      <SelectItem value="avaliador">Avaliador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
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
                  <Button type="submit">
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Convite
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                {invites.filter(i => i.status === "pendente").length}
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
                {invites.filter(i => i.status === "aceito").length}
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
                          Perfil: {invite.role} • Enviado em {invite.sentDate}
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
                          {invite.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Expira em {invite.expiresIn}
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
                            copyToClipboard(invite.inviteLink, invite.id)
                          }
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {copiedInvite === invite.id
                            ? "Copiado!"
                            : "Copiar Link"}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="h-4 w-4 mr-2" />
                          Reenviar Convite
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancelar Convite
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
