import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  GraduationCap,
  Loader2,
  Clock,
  Users,
  Calendar,
  FileDown,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned: { label: "Planejado", variant: "secondary" },
  active: { label: "Em Andamento", variant: "default" },
  completed: { label: "Concluido", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  training: { label: "Treinamento", variant: "default" },
  workshop: { label: "Workshop", variant: "secondary" },
  leadership: { label: "Lideranca", variant: "outline" },
};

export default function TrainingPrograms() {
  usePageMeta({ title: "Programas de Treinamento" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const tenantId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    programType: "training",
    targetAudience: "",
    duration: "",
    facilitator: "",
    startDate: "",
    endDate: "",
    maxParticipants: "",
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

  const { data: programs = [], refetch } = trpc.training.listPrograms.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const createMutation = trpc.training.createProgram.useMutation({
    onSuccess: () => {
      toast.success("Programa de treinamento criado com sucesso!");
      setDialogOpen(false);
      setForm({
        title: "", description: "", programType: "training", targetAudience: "",
        duration: "", facilitator: "", startDate: "", endDate: "", maxParticipants: "",
      });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar programa");
    },
  });

  const handleCreate = () => {
    if (!form.title) {
      toast.error("Informe o titulo do programa");
      return;
    }
    createMutation.mutate({
      tenantId,
      title: form.title,
      description: form.description,
      programType: form.programType,
      targetAudience: form.targetAudience,
      durationHours: form.duration ? parseInt(form.duration) : undefined,
      facilitator: form.facilitator,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      maxParticipants: form.maxParticipants ? parseInt(form.maxParticipants) : undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Programas de Treinamento</h1>
            <p className="text-muted-foreground">
              Gerencie treinamentos, workshops e programas de lideranca
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => trpc.nr01Pdf.exportTrainingReport.mutate({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Programa
            </Button>
          </div>
        </div>

        {programs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum programa cadastrado</h3>
              <p className="text-muted-foreground">
                Crie seu primeiro programa de treinamento para comecar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program: any) => {
              const status = STATUS_CONFIG[program.status] || STATUS_CONFIG.planned;
              const type = TYPE_CONFIG[program.programType] || TYPE_CONFIG.training;
              return (
                <Card
                  key={program.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/training/${program.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{program.title}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <CardDescription>
                      <Badge variant={type.variant} className="mr-2">{type.label}</Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {program.durationHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{program.durationHours}h de duracao</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {program.participantCount ?? 0}
                          {program.maxParticipants ? ` / ${program.maxParticipants}` : ""} participantes
                        </span>
                      </div>
                      {(program.startDate || program.endDate) && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {program.startDate
                              ? new Date(program.startDate).toLocaleDateString("pt-BR")
                              : "—"}
                            {" — "}
                            {program.endDate
                              ? new Date(program.endDate).toLocaleDateString("pt-BR")
                              : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Programa de Treinamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Gestao de Riscos Psicossociais"
                />
              </div>
              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Objetivos e conteudo do programa..."
                  rows={3}
                />
              </div>
              <div>
                <Label>Tipo de Programa</Label>
                <Select value={form.programType} onValueChange={(v) => setForm({ ...form, programType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Treinamento</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="leadership">Programa de Lideranca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="targetAudience">Publico-alvo</Label>
                <Input
                  id="targetAudience"
                  value={form.targetAudience}
                  onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="Gestores e lideres de equipe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duracao (horas)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    placeholder="16"
                  />
                </div>
                <div>
                  <Label htmlFor="maxParticipants">Max. Participantes</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={form.maxParticipants}
                    onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="facilitator">Facilitador</Label>
                <Input
                  id="facilitator"
                  value={form.facilitator}
                  onChange={(e) => setForm({ ...form, facilitator: e.target.value })}
                  placeholder="Nome do facilitador"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Data de Termino</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Programa
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
