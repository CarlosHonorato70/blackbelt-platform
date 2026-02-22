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
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DataExport() {
  const { selectedTenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    requestType: "export",
    reason: "",
  });
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    email: string;
    requestType: string;
    status: string;
    requestDate: string;
    completionDate: string | null;
    format: string | null;
    fileSize: string | null;
    downloadLink: string | null;
  } | null>(null);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para gerenciar exportação de dados
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Mock data - será substituído por dados reais do backend
  const [dsrRequests, setDsrRequests] = useState([
    {
      id: "1",
      email: "joao.silva@example.com",
      requestType: "export",
      status: "completo",
      requestDate: "18/10/2025",
      completionDate: "20/10/2025",
      format: "PDF",
      fileSize: "2.5 MB",
      downloadLink: "https://storage.example.com/dsr-001.pdf",
    },
    {
      id: "2",
      email: "maria.santos@example.com",
      requestType: "delete",
      status: "processando",
      requestDate: "19/10/2025",
      completionDate: null,
      format: null,
      fileSize: null,
      downloadLink: null,
    },
    {
      id: "3",
      email: "pedro.oliveira@example.com",
      requestType: "export",
      status: "pendente",
      requestDate: "20/10/2025",
      completionDate: null,
      format: null,
      fileSize: null,
      downloadLink: null,
    },
    {
      id: "4",
      email: "ana.costa@example.com",
      requestType: "export",
      status: "completo",
      requestDate: "15/10/2025",
      completionDate: "17/10/2025",
      format: "JSON",
      fileSize: "1.8 MB",
      downloadLink: "https://storage.example.com/dsr-004.json",
    },
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRequestTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, requestType: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrar com tRPC para criar solicitação DSR
    console.log("Solicitação DSR enviada:", formData);
    setFormData({ email: "", requestType: "export", reason: "" });
    setDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completo":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "processando":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "pendente":
        return <Clock className="h-4 w-4 text-gray-600" />;
      case "erro":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completo":
        return "bg-green-100 text-green-800";
      case "processando":
        return "bg-yellow-100 text-yellow-800";
      case "pendente":
        return "bg-gray-100 text-gray-800";
      case "erro":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "export":
        return "Exportação de Dados";
      case "delete":
        return "Direito ao Esquecimento";
      case "rectify":
        return "Retificação de Dados";
      default:
        return type;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Exportação de Dados (LGPD)
            </h1>
            <p className="text-muted-foreground">
              Gerencie solicitações de Direitos do Titular de Dados -{" "}
              {typeof selectedTenant === "string"
                ? selectedTenant
                : selectedTenant?.name}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Solicitação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Solicitação de Direitos do Titular</DialogTitle>
                <DialogDescription>
                  Conforme Lei Geral de Proteção de Dados (LGPD)
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail do Titular *</Label>
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
                  <Label htmlFor="requestType">Tipo de Solicitação *</Label>
                  <Select
                    value={formData.requestType}
                    onValueChange={handleRequestTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="export">
                        Exportação de Dados (Portabilidade)
                      </SelectItem>
                      <SelectItem value="delete">
                        Direito ao Esquecimento (Exclusão)
                      </SelectItem>
                      <SelectItem value="rectify">
                        Retificação de Dados
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo/Observações</Label>
                  <textarea
                    id="reason"
                    name="reason"
                    placeholder="Descreva o motivo da solicitação..."
                    rows={3}
                    value={formData.reason}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Informações Importantes:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Prazo para resposta: até 15 dias úteis</li>
                    <li>Dados serão fornecidos em formato estruturado</li>
                    <li>Solicitação será registrada para auditoria</li>
                  </ul>
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
                    <Shield className="h-4 w-4 mr-2" />
                    Criar Solicitação
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resumo de Solicitações */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total de Solicitações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{dsrRequests.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Completas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {dsrRequests.filter(r => r.status === "completo").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Processando</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {dsrRequests.filter(r => r.status === "processando").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-600">
                {dsrRequests.filter(r => r.status === "pendente").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Solicitações */}
        <Card>
          <CardHeader>
            <CardTitle>Solicitações de Direitos do Titular</CardTitle>
            <CardDescription>Histórico de solicitações LGPD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dsrRequests.map(request => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{request.email}</h4>
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                        {getRequestTypeLabel(request.requestType)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Solicitado em {request.requestDate}
                      {request.completionDate &&
                        ` • Concluído em ${request.completionDate}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-2">
                        {getStatusIcon(request.status)}
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusColor(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>
                      {request.fileSize && (
                        <p className="text-xs text-muted-foreground">
                          {request.format} • {request.fileSize}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {request.status === "completo" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                toast.success("Download iniciado!", {
                                  description: `Arquivo ${request.format} (${request.fileSize}) será baixado.`,
                                });
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar Dados
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedRequest(request);
                                setReportDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Relatório
                            </DropdownMenuItem>
                          </>
                        )}
                        {request.status !== "completo" && (
                          <DropdownMenuItem disabled>
                            <Clock className="h-4 w-4 mr-2" />
                            Processando...
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja cancelar a solicitação de ${request.email}?`)) {
                              setDsrRequests(prev => prev.filter(r => r.id !== request.id));
                              toast.success("Solicitação cancelada com sucesso!");
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancelar Solicitação
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Formatos de Exportação */}
        <Card>
          <CardHeader>
            <CardTitle>Formatos de Exportação Disponíveis</CardTitle>
            <CardDescription>
              Escolha o formato mais adequado para seus dados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileJson className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold">JSON</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Formato estruturado para processamento automatizado
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">Excel</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Planilha com abas para cada tipo de dado
                </p>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-red-600" />
                  <h4 className="font-semibold">PDF</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Relatório formatado para leitura e impressão
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações LGPD */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Conformidade com LGPD
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              • Direito de Acesso: Você pode solicitar cópia de seus dados
              pessoais
            </p>
            <p>
              • Direito à Portabilidade: Dados fornecidos em formato estruturado
            </p>
            <p>
              • Direito ao Esquecimento: Solicitação de exclusão de dados
              pessoais
            </p>
            <p>
              • Direito de Retificação: Correção de dados incorretos ou
              incompletos
            </p>
            <p>
              • Prazo de Resposta: Até 15 dias úteis para atender solicitações
            </p>
            <p>
              • Registro: Todas as solicitações são registradas para auditoria
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Details Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>Informações completas da solicitação DSR</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Email do Titular</p>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo de Solicitação</p>
                  <p className="font-medium">{getRequestTypeLabel(selectedRequest.requestType)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data da Solicitação</p>
                  <p className="font-medium">{selectedRequest.requestDate}</p>
                </div>
                {selectedRequest.completionDate && (
                  <div>
                    <p className="text-muted-foreground text-xs">Data de Conclusão</p>
                    <p className="font-medium">{selectedRequest.completionDate}</p>
                  </div>
                )}
                {selectedRequest.format && (
                  <div>
                    <p className="text-muted-foreground text-xs">Formato</p>
                    <p className="font-medium">{selectedRequest.format}</p>
                  </div>
                )}
                {selectedRequest.fileSize && (
                  <div>
                    <p className="text-muted-foreground text-xs">Tamanho do Arquivo</p>
                    <p className="font-medium">{selectedRequest.fileSize}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
