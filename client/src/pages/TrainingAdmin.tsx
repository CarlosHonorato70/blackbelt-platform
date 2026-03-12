import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Edit,
  GraduationCap,
  Loader2,
  Plus,
  Trash2,
  Video,
  FileDown,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Ativo",
  archived: "Arquivado",
};

const STATUS_VARIANTS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 hover:bg-gray-100",
  active: "bg-green-100 text-green-800 hover:bg-green-100",
  archived: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
};

type ModuleForm = {
  title: string;
  content: string;
  order: string;
  durationMinutes: string;
  videoUrl: string;
  passingScore: string;
};

const EMPTY_MODULE: ModuleForm = {
  title: "",
  content: "",
  order: "",
  durationMinutes: "",
  videoUrl: "",
  passingScore: "70",
};

export default function TrainingAdmin() {
  usePageMeta({ title: "Administração de Treinamento" });
  const { exportPdf, isExporting } = usePdfExport();
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(EMPTY_MODULE);

  const programQuery = trpc.training.getProgram.useQuery(
    { id: programId!, tenantId: tenantId! },
    { enabled: !!programId && !!tenantId }
  );

  const addModuleMutation = trpc.training.addModule.useMutation({
    onSuccess: () => {
      toast.success("Módulo adicionado com sucesso!");
      setAddOpen(false);
      setModuleForm(EMPTY_MODULE);
      programQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateModuleMutation = trpc.training.updateModule.useMutation({
    onSuccess: () => {
      toast.success("Módulo atualizado com sucesso!");
      setEditOpen(false);
      setModuleForm(EMPTY_MODULE);
      programQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteModuleMutation = trpc.training.deleteModule.useMutation({
    onSuccess: () => {
      toast.success("Módulo removido com sucesso!");
      setDeleteOpen(false);
      setSelectedModuleId(null);
      programQuery.refetch();
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

  if (programQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const program = programQuery.data as any;
  if (!program) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Programa de treinamento não encontrado.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const modules = ((program.modules || []) as any[]).sort(
    (a: any, b: any) => (a.order || 0) - (b.order || 0)
  );

  const handleAdd = () => {
    if (!moduleForm.title || !moduleForm.content) {
      toast.error("Preencha título e conteúdo.");
      return;
    }
    addModuleMutation.mutate({
      programId: programId!,
      tenantId: tenantId!,
      title: moduleForm.title,
      content: moduleForm.content,
      order: moduleForm.order ? parseInt(moduleForm.order) : undefined,
      durationMinutes: moduleForm.durationMinutes ? parseInt(moduleForm.durationMinutes) : undefined,
      videoUrl: moduleForm.videoUrl || undefined,
      passingScore: moduleForm.passingScore ? parseInt(moduleForm.passingScore) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!selectedModuleId || !moduleForm.title || !moduleForm.content) {
      toast.error("Preencha título e conteúdo.");
      return;
    }
    updateModuleMutation.mutate({
      id: selectedModuleId,
      tenantId: tenantId!,
      title: moduleForm.title,
      content: moduleForm.content,
      order: moduleForm.order ? parseInt(moduleForm.order) : undefined,
      durationMinutes: moduleForm.durationMinutes ? parseInt(moduleForm.durationMinutes) : undefined,
      videoUrl: moduleForm.videoUrl || undefined,
      passingScore: moduleForm.passingScore ? parseInt(moduleForm.passingScore) : undefined,
    });
  };

  const openEditDialog = (mod: any) => {
    setSelectedModuleId(mod.id);
    setModuleForm({
      title: mod.title || "",
      content: mod.content || "",
      order: mod.order?.toString() || "",
      durationMinutes: mod.durationMinutes?.toString() || "",
      videoUrl: mod.videoUrl || "",
      passingScore: mod.passingScore?.toString() || "70",
    });
    setEditOpen(true);
  };

  const openDeleteDialog = (modId: string) => {
    setSelectedModuleId(modId);
    setDeleteOpen(true);
  };

  const statusCls = STATUS_VARIANTS[program.status] || STATUS_VARIANTS.draft;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => trpc.nr01Pdf.exportTrainingReport.mutate({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {program.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {program.type && <span className="capitalize">{program.type}</span>}
                  {program.startDate && (
                    <span>
                      {" "}| Início: {new Date(program.startDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {program.endDate && (
                    <span>
                      {" "}| Fim: {new Date(program.endDate).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge className={statusCls}>
                {STATUS_LABELS[program.status] || program.status}
              </Badge>
            </div>
          </CardHeader>
          {program.description && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{program.description}</p>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Módulos ({modules.length})
          </h2>
          <Button onClick={() => { setModuleForm(EMPTY_MODULE); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Módulo
          </Button>
        </div>

        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum módulo adicionado. Clique em "Adicionar Módulo" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Ordem</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Vídeo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((mod: any) => (
                    <TableRow key={mod.id}>
                      <TableCell className="font-mono">{mod.order || "—"}</TableCell>
                      <TableCell className="font-medium">{mod.title}</TableCell>
                      <TableCell>
                        {mod.durationMinutes ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {mod.durationMinutes} min
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {mod.passingScore ? (
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {mod.passingScore}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem quiz</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {mod.videoUrl ? (
                          <Video className="h-4 w-4 text-green-600" />
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(mod)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(mod.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Add Module Dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Módulo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="add-title">Título *</Label>
                <Input
                  id="add-title"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  placeholder="Título do módulo"
                />
              </div>
              <div>
                <Label htmlFor="add-content">Conteúdo (Markdown) *</Label>
                <Textarea
                  id="add-content"
                  value={moduleForm.content}
                  onChange={(e) => setModuleForm({ ...moduleForm, content: e.target.value })}
                  placeholder="Conteúdo do módulo em markdown"
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="add-order">Ordem</Label>
                  <Input
                    id="add-order"
                    type="number"
                    value={moduleForm.order}
                    onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="add-duration">Duração (min)</Label>
                  <Input
                    id="add-duration"
                    type="number"
                    value={moduleForm.durationMinutes}
                    onChange={(e) => setModuleForm({ ...moduleForm, durationMinutes: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="add-video">URL do Vídeo (opcional)</Label>
                <Input
                  id="add-video"
                  value={moduleForm.videoUrl}
                  onChange={(e) => setModuleForm({ ...moduleForm, videoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="add-score">Nota Mínima para Aprovação (%)</Label>
                <Input
                  id="add-score"
                  type="number"
                  value={moduleForm.passingScore}
                  onChange={(e) => setModuleForm({ ...moduleForm, passingScore: e.target.value })}
                  placeholder="70"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={addModuleMutation.isPending}>
                {addModuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Module Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Módulo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Conteúdo (Markdown) *</Label>
                <Textarea
                  id="edit-content"
                  value={moduleForm.content}
                  onChange={(e) => setModuleForm({ ...moduleForm, content: e.target.value })}
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-order">Ordem</Label>
                  <Input
                    id="edit-order"
                    type="number"
                    value={moduleForm.order}
                    onChange={(e) => setModuleForm({ ...moduleForm, order: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duração (min)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    value={moduleForm.durationMinutes}
                    onChange={(e) => setModuleForm({ ...moduleForm, durationMinutes: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-video">URL do Vídeo (opcional)</Label>
                <Input
                  id="edit-video"
                  value={moduleForm.videoUrl}
                  onChange={(e) => setModuleForm({ ...moduleForm, videoUrl: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-score">Nota Mínima para Aprovação (%)</Label>
                <Input
                  id="edit-score"
                  type="number"
                  value={moduleForm.passingScore}
                  onChange={(e) => setModuleForm({ ...moduleForm, passingScore: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateModuleMutation.isPending}>
                {updateModuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Tem certeza que deseja remover este módulo? Esta ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedModuleId) {
                    deleteModuleMutation.mutate({
                      id: selectedModuleId,
                      tenantId: tenantId!,
                    });
                  }
                }}
                disabled={deleteModuleMutation.isPending}
              >
                {deleteModuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
