import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Upload, Download, Mail, CheckCircle, Clock, AlertCircle, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
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

  const invitesQuery = trpc.assessments.listInvites.useQuery(
    { tenantId: "default-tenant" },
    { enabled: !!user }
  );

  const sendInvitesMutation = trpc.assessments.sendInvites.useMutation({
    onSuccess: () => {
      invitesQuery.refetch();
      setInvitees([]);
      setAssessmentTitle("");
    },
  });

  const invites = invitesQuery.data || [];

  // Importar Excel
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
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

        const validRows = rows.filter((row) => row.email && row.name);
        if (validRows.length === 0) {
          alert("Nenhuma linha válida encontrada. Certifique-se de ter colunas 'email' e 'name'");
          return;
        }

        setInvitees(validRows);
        alert(`${validRows.length} respondentes importados com sucesso`);
      } catch (error) {
        alert("Erro ao processar arquivo: " + (error instanceof Error ? error.message : "Desconhecido"));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Exportar template
  const handleExportTemplate = () => {
    const template = [
      { email: "joao@empresa.com", name: "João Silva", position: "Gerente", sector: "TI" },
      { email: "maria@empresa.com", name: "Maria Santos", position: "Analista", sector: "RH" },
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
        tenantId: "default-tenant",
        assessmentTitle,
        invitees,
        expiresIn: parseInt(expiresIn),
      });
      alert(`${invitees.length} convites enviados com sucesso!`);
    } catch (error) {
      alert("Erro ao enviar convites: " + (error instanceof Error ? error.message : "Desconhecido"));
    } finally {
      setIsLoading(false);
    }
  };

  // Remover respondente da lista
  const handleRemoveInvitee = (index: number) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-gray-100 text-gray-800">Pendente</Badge>;
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">Enviado</Badge>;
      case "viewed":
        return <Badge className="bg-yellow-100 text-yellow-800">Visualizado</Badge>;
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
        <p className="text-gray-600 mt-2">Importe respondentes e envie convites em lote para participar da avaliação</p>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Enviar Convites</TabsTrigger>
          <TabsTrigger value="history">Histórico ({invites.length})</TabsTrigger>
        </TabsList>

        {/* ENVIAR CONVITES */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>1. Importar Respondentes</CardTitle>
              <CardDescription>Carregue um arquivo Excel com email e nome dos respondentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-600 mt-2">Formatos aceitos: .xlsx, .xls, .csv</p>
                </div>
                <Button variant="outline" onClick={handleExportTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
              </div>

              {invitees.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900">
                    {invitees.length} respondente{invitees.length !== 1 ? "s" : ""} importado{invitees.length !== 1 ? "s" : ""}
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
                          <TableCell className="font-mono text-sm">{invitee.email}</TableCell>
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
                <label className="block text-sm font-medium mb-2">Título da Avaliação</label>
                <Input
                  placeholder="Ex: Avaliação de Riscos Psicossociais - Q1 2025"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Validade do Convite (dias)</label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Enviar Convites</CardTitle>
              <CardDescription>Dispare os emails para todos os respondentes</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={invitees.length === 0 || !assessmentTitle.trim() || isLoading}
                className="w-full"
                size="lg"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isLoading ? "Enviando..." : `Enviar ${invitees.length} Convite${invitees.length !== 1 ? "s" : ""}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="history" className="space-y-4">
          {invites.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhum convite enviado ainda
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <Card key={invite.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{invite.respondentName}</p>
                        <p className="text-sm text-gray-600 font-mono">{invite.respondentEmail}</p>
                        <div className="flex gap-2 mt-3">
                          {getStatusBadge(invite.status)}
                          {invite.sentAt && (
                            <span className="text-xs text-gray-600">
                              Enviado em {new Date(invite.sentAt).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {invite.status === "pending" && (
                          <Button size="sm" variant="outline">
                            <Mail className="w-4 h-4 mr-2" />
                            Reenviar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* DIALOG DE CONFIRMACAO */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envio de Convites</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar {invitees.length} convite{invitees.length !== 1 ? "s" : ""} para a avaliação "{assessmentTitle}".
              <br />
              <br />
              Os respondentes receberão um email com um link para responder ao questionário COPSOQ-II. O convite expirará em {expiresIn} dias.
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
    </div>
  );
}
