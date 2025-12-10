import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  Download,
  Mail,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Plus,
  UserPlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth.tsx";
import * as XLSX from "xlsx";

interface Invitee {
  email: string;
  name: string;
  position?: string;
  sector?: string;
}

export default function CopsoqInvites() {
  const { user } = useAuth();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [assessmentTitle, setAssessmentTitle] = useState("");
  const [expiresIn, setExpiresIn] = useState("7");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedInvitee, setSelectedInvitee] = useState<Invitee | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Manual entry fields
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPosition, setManualPosition] = useState("");
  const [manualSector, setManualSector] = useState("");

  const invitesQuery = trpc.assessments.listInvites.useQuery(
    undefined,
    { enabled: !!user }
  );

  const sendInvitesMutation = trpc.assessments.sendInvites.useMutation({
    onSuccess: () => {
      invitesQuery.refetch();
      setInvitees([]);
      setAssessmentTitle("");
    },
  });

  const cancelInviteMutation = trpc.assessments.cancelInvite.useMutation({
    onSuccess: () => {
      invitesQuery.refetch();
      setInviteToCancel(null);
      setShowCancelConfirm(false);
    },
  });

  const invites = invitesQuery.data || [];

  // Importar Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Invitee>(worksheet);

        // Validar colunas necessárias
        if (rows.length === 0) {
          alert("Arquivo vazio");
          return;
        }

        const validRows = rows.filter(row => row.email && row.name);
        if (validRows.length === 0) {
          alert(
            "Nenhuma linha válida encontrada. Certifique-se de ter colunas 'email' e 'name'"
          );
          return;
        }

        setInvitees(validRows);
        alert(`${validRows.length} respondentes importados com sucesso`);
      } catch (error) {
        alert(
          "Erro ao processar arquivo: " +
            (error instanceof Error ? error.message : "Desconhecido")
        );
      }
    };
    reader.readAsBinaryString(file);
  };

  // Exportar template
  const handleExportTemplate = () => {
    const template = [
      {
        email: "joao@empresa.com",
        name: "João Silva",
        position: "Gerente",
        sector: "TI",
      },
      {
        email: "maria@empresa.com",
        name: "Maria Santos",
        position: "Analista",
        sector: "RH",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Respondentes");
    XLSX.writeFile(workbook, "template_copsoq.xlsx");
  };

  // Enviar convites
  const handleSendInvites = async () => {
    if (!assessmentTitle.trim()) {
      alert("Por favor, insira o título da avaliação");
      return;
    }

    if (invitees.length === 0) {
      alert("Por favor, importe respondentes");
      return;
    }

    setIsLoading(true);
    try {
      await sendInvitesMutation.mutateAsync({
        assessmentTitle,
        invitees,
        expiresIn: parseInt(expiresIn),
      });
      alert(`${invitees.length} convites enviados com sucesso!`);
    } catch (error) {
      alert(
        "Erro ao enviar convites: " +
          (error instanceof Error ? error.message : "Desconhecido")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Remover respondente da lista
  const handleRemoveInvitee = (index: number) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };
  
  // Adicionar respondente manualmente
  const handleAddManualInvitee = () => {
    if (!manualEmail.trim() || !manualName.trim()) {
      alert("Por favor, preencha pelo menos o email e o nome");
      return;
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(manualEmail)) {
      alert("Por favor, insira um email válido");
      return;
    }
    
    // Verificar duplicatas
    if (invitees.some(inv => inv.email.toLowerCase() === manualEmail.toLowerCase())) {
      alert("Este email já foi adicionado à lista");
      return;
    }
    
    const newInvitee: Invitee = {
      email: manualEmail.trim(),
      name: manualName.trim(),
      position: manualPosition.trim() || undefined,
      sector: manualSector.trim() || undefined,
    };
    
    setInvitees([...invitees, newInvitee]);
    
    // Limpar campos
    setManualEmail("");
    setManualName("");
    setManualPosition("");
    setManualSector("");
  };

  // Cancelar convite
  const handleCancelInvite = async () => {
    if (!inviteToCancel) return;
    try {
      await cancelInviteMutation.mutateAsync({ inviteId: inviteToCancel });
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gray-100 text-gray-800">Pendente</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case "viewed":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Visualizado</Badge>
        );
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Convites COPSOQ-II</h1>
        <p className="text-gray-600 mt-2">
          Importe respondentes e envie convites em lote para participar da
          avaliação
        </p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Enviar Convites</TabsTrigger>
          <TabsTrigger value="history">
            Histórico ({invites.length})
          </TabsTrigger>
        </TabsList>

        {/* ENVIAR CONVITES */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Adicionar Respondentes</CardTitle>
              <CardDescription>
                Adicione respondentes manualmente ou importe de um arquivo Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ENTRADA MANUAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-sm">Adicionar Manualmente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      placeholder="joao@empresa.com"
                      value={manualEmail}
                      onChange={e => setManualEmail(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualInvitee();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="João Silva"
                      value={manualName}
                      onChange={e => setManualName(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualInvitee();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Posição (opcional)
                    </label>
                    <Input
                      placeholder="Gerente"
                      value={manualPosition}
                      onChange={e => setManualPosition(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualInvitee();
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Setor (opcional)
                    </label>
                    <Input
                      placeholder="TI"
                      value={manualSector}
                      onChange={e => setManualSector(e.target.value)}
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualInvitee();
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddManualInvitee}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Respondente
                </Button>
              </div>

              {/* DIVISOR */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">OU</span>
                </div>
              </div>

              {/* IMPORTAR EXCEL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-sm">Importar de Excel</h3>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      Formatos aceitos: .xlsx, .xls, .csv
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExportTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Template
                  </Button>
                </div>
              </div>

              {invitees.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900">
                    {invitees.length} respondente
                    {invitees.length !== 1 ? "s" : ""} na lista
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {invitees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Respondentes Importados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitees.map((invitee, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {invitee.email}
                          </TableCell>
                          <TableCell>{invitee.name}</TableCell>
                          <TableCell>{invitee.position || "-"}</TableCell>
                          <TableCell>{invitee.sector || "-"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveInvitee(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>2. Configurar Avaliação</CardTitle>
              <CardDescription>Defina os detalhes da avaliação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Título da Avaliação
                </label>
                <Input
                  placeholder="Ex: Avaliação de Riscos Psicossociais - Q1 2025"
                  value={assessmentTitle}
                  onChange={e => setAssessmentTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Validade do Convite (dias)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={expiresIn}
                  onChange={e => setExpiresIn(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Enviar Convites</CardTitle>
              <CardDescription>
                Dispare os emails para todos os respondentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={
                  invitees.length === 0 || !assessmentTitle.trim() || isLoading
                }
                className="w-full"
                size="lg"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isLoading
                  ? "Enviando..."
                  : `Enviar ${invitees.length} Convite${invitees.length !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="history" className="space-y-4">
          {invites.filter((i: any) => i.status !== "expired").length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhum convite enviado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invites.map((invite: any) => {
                if (invite.status === "expired") return null;
                return (
                  <Card key={invite.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">
                            {invite.respondentName}
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {invite.respondentEmail}
                          </p>
                          <div className="flex gap-2 mt-3">
                            {getStatusBadge(invite.status)}
                            {invite.sentAt && (
                              <span className="text-xs text-gray-600">
                                Enviado em{" "}
                                {new Date(invite.sentAt).toLocaleDateString(
                                  "pt-BR"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {invite.status !== "completed" &&
                            invite.status !== "expired" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setInviteToCancel(invite.id);
                                  setShowCancelConfirm(true);
                                }}
                                disabled={cancelInviteMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Cancelar
                              </Button>
                            )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG DE CONFIRMACAO - ENVIAR CONVITES */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio de Convites</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar {invitees.length} convite
              {invitees.length !== 1 ? "s" : ""} para a avaliação "
              {assessmentTitle}".
              <br />
              <br />
              Os respondentes receberão um email com um link para responder ao
              questionário COPSOQ-II. O convite expirará em {expiresIn} dias.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <p className="text-sm font-medium">Resumo:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Total de respondentes: {invitees.length}</li>
              <li>• Título da avaliação: {assessmentTitle}</li>
              <li>• Validade: {expiresIn} dias</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendInvites} disabled={isLoading}>
              {isLoading ? "Enviando..." : "Confirmar e Enviar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG DE CONFIRMACAO - CANCELAR CONVITE */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este convite? O respondente não
              poderá mais acessar o questionário COPSOQ-II.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Manter Convite</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvite}
              disabled={cancelInviteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {cancelInviteMutation.isPending
                ? "Cancelando..."
                : "Cancelar Convite"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
