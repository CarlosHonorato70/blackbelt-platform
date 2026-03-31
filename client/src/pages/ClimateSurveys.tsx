import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { Plus, ClipboardList, Loader2, BarChart2, FileDown } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useNavigate } from "react-router-dom";

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  climate: { label: "Clima", variant: "default" },
  stress: { label: "Estresse", variant: "outline" },
  burnout: { label: "Burnout", variant: "destructive" },
  engagement: { label: "Engajamento", variant: "secondary" },
};

const QUESTIONS_PLACEHOLDER = `[
  {
    "text": "Como você avalia o clima organizacional?",
    "type": "scale",
    "options": [1, 2, 3, 4, 5]
  },
  {
    "text": "Voce se sente valorizado pela empresa?",
    "type": "scale",
    "options": [1, 2, 3, 4, 5]
  }
]`;

export default function ClimateSurveys() {
  usePageMeta({ title: "Pesquisas de Clima" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    surveyType: "climate",
    questions: "",
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

  const { data: surveys = [], refetch } = trpc.climateSurveys.list.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const createMutation = trpc.climateSurveys.create.useMutation({
    onSuccess: () => {
      toast.success("Pesquisa criada com sucesso!");
      setDialogOpen(false);
      setForm({ title: "", description: "", surveyType: "climate", questions: "" });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar pesquisa");
    },
  });

  const handleCreate = () => {
    if (!form.title) {
      toast.error("Informe o titulo da pesquisa");
      return;
    }

    let parsedQuestions;
    if (form.questions.trim()) {
      try {
        parsedQuestions = JSON.parse(form.questions);
      } catch {
        toast.error("JSON das perguntas esta invalido");
        return;
      }
    }

    createMutation.mutate({
      tenantId,
      title: form.title,
      description: form.description,
      surveyType: form.surveyType,
      questions: parsedQuestions,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pesquisas de Clima</h1>
            <p className="text-muted-foreground">
              Gerencie pesquisas de clima, estresse, burnout e engajamento
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => trpc.nr01Pdf.exportClimateSurvey.mutate({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Pesquisa
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Pesquisas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surveys.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma pesquisa cadastrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Respostas</TableHead>
                    <TableHead>Data de Criacao</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey: any) => {
                    const typeConfig = TYPE_CONFIG[survey.surveyType] || TYPE_CONFIG.climate;
                    return (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">{survey.title}</TableCell>
                        <TableCell>
                          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={survey.status === "active" ? "default" : "secondary"}>
                            {survey.status === "active" ? "Ativa" : "Inativa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{survey.responseCount ?? 0}</TableCell>
                        <TableCell>
                          {survey.createdAt
                            ? new Date(survey.createdAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/climate-surveys/${survey.id}/results`)}
                          >
                            <BarChart2 className="mr-1 h-4 w-4" />
                            Resultados
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Pesquisa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Pesquisa de Clima Organizacional 2026"
                />
              </div>
              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Objetivo e contexto da pesquisa..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Tipo de Pesquisa</Label>
                <Select value={form.surveyType} onValueChange={(v) => setForm({ ...form, surveyType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="climate">Clima Organizacional</SelectItem>
                    <SelectItem value="stress">Estresse Ocupacional</SelectItem>
                    <SelectItem value="burnout">Burnout</SelectItem>
                    <SelectItem value="engagement">Engajamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="questions">Perguntas (JSON)</Label>
                <Textarea
                  id="questions"
                  value={form.questions}
                  onChange={(e) => setForm({ ...form, questions: e.target.value })}
                  placeholder={QUESTIONS_PLACEHOLDER}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Pesquisa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
