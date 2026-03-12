import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  FileCode,
  Loader2,
  Download,
  CheckCircle,
  FileUp,
  AlertTriangle,
} from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  "S-2220": "Monitoramento da Saúde",
  "S-2240": "Condições Ambientais",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  validated: { label: "Validado", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  submitted: { label: "Enviado", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  accepted: { label: "Aceito", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  rejected: { label: "Rejeitado", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

export default function EsocialExport() {
  usePageMeta({ title: "Exportação eSocial" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [eventType, setEventType] = useState("");
  const [riskAssessmentId, setRiskAssessmentId] = useState("");

  const exportsQuery = trpc.esocialExport.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  const riskAssessmentsQuery = trpc.riskAssessments.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  const generateMutation = trpc.esocialExport.generateXml.useMutation({
    onSuccess: () => {
      toast.success("XML gerado com sucesso!");
      setEventType("");
      setRiskAssessmentId("");
      exportsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const validateMutation = trpc.esocialExport.validate.useMutation({
    onSuccess: () => {
      toast.success("Exportação validada com sucesso!");
      exportsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!tenantId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione uma empresa para continuar.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleGenerate = () => {
    if (!eventType || !riskAssessmentId) {
      toast.error("Selecione o tipo de evento e a avaliação de risco.");
      return;
    }
    generateMutation.mutate({
      tenantId: tenantId!,
      eventType,
      riskAssessmentId,
    });
  };

  const handleCopyXml = (xmlContent: string) => {
    navigator.clipboard.writeText(xmlContent);
    toast.success("XML copiado para a área de transferência!");
  };

  const exports = (exportsQuery.data || []) as any[];
  const riskAssessments = (riskAssessmentsQuery.data || []) as any[];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCode className="h-6 w-6" />
            Exportação eSocial
          </h1>
          <p className="text-muted-foreground">
            Gere e valide arquivos XML para envio ao eSocial
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerar Exportação eSocial</CardTitle>
            <CardDescription>
              Selecione o tipo de evento e a avaliação de risco para gerar o XML
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Tipo de Evento</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {key}: {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Avaliação de Risco</Label>
                <Select value={riskAssessmentId} onValueChange={setRiskAssessmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a avaliação" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskAssessments.map((ra: any) => (
                      <SelectItem key={ra.id} value={ra.id}>
                        {ra.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !eventType || !riskAssessmentId}
                  className="w-full"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="mr-2 h-4 w-4" />
                  )}
                  Gerar XML
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportações Geradas</CardTitle>
            <CardDescription>Histórico de exportações eSocial</CardDescription>
          </CardHeader>
          <CardContent>
            {exportsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : exports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma exportação encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exp: any) => {
                    const statusCfg = STATUS_CONFIG[exp.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={exp.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {exp.eventType}: {EVENT_TYPE_LABELS[exp.eventType] || exp.eventType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(exp.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {exp.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                validateMutation.mutate({ id: exp.id, tenantId: tenantId! })
                              }
                              disabled={validateMutation.isPending}
                            >
                              {validateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Validar
                                </>
                              )}
                            </Button>
                          )}
                          {exp.xmlContent && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyXml(exp.xmlContent)}
                            >
                              <Download className="mr-1 h-4 w-4" />
                              Baixar XML
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
