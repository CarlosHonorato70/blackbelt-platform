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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Download, Edit2, Plus, Trash2, Upload, Users, UserSquare2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

export default function People() {
  const { selectedTenant } = useTenant();
  const { user } = useAuth();
  // For company users, selectedTenant may be null — use user's own tenantId
  const effectiveCompanyId = selectedTenant?.id || user?.tenantId;
  const effectiveCompanyName = selectedTenant?.name || user?.name || "Empresa";

  // --- People state ---
  const [peopleDialogMode, setPeopleDialogMode] = useState<DialogMode>("closed");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // --- Sectors state ---
  const [sectorDialogMode, setSectorDialogMode] = useState<DialogMode>("closed");
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // --- People queries/mutations ---
  const { data: people, isLoading: peopleLoading } = trpc.people.list.useQuery(
    undefined,
    { enabled: !!effectiveCompanyId }
  );

  const { data: sectors, isLoading: sectorsLoading } = trpc.sectors.list.useQuery(
    undefined,
    { enabled: !!effectiveCompanyId }
  );

  const createPersonMutation = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      utils.people.list.invalidate();
      setPeopleDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar colaborador");
    },
  });

  const updatePersonMutation = trpc.people.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      utils.people.list.invalidate();
      setPeopleDialogMode("closed");
      setSelectedPersonId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar colaborador");
    },
  });

  const deletePersonMutation = trpc.people.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador deletado com sucesso!");
      utils.people.list.invalidate();
      setPeopleDialogMode("closed");
      setSelectedPersonId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar colaborador");
    },
  });

  // --- Sectors mutations ---
  const createSectorMutation = trpc.sectors.create.useMutation({
    onSuccess: () => {
      toast.success("Setor criado com sucesso!");
      utils.sectors.list.invalidate();
      setSectorDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar setor");
    },
  });

  const updateSectorMutation = trpc.sectors.update.useMutation({
    onSuccess: () => {
      toast.success("Setor atualizado com sucesso!");
      utils.sectors.list.invalidate();
      setSectorDialogMode("closed");
      setSelectedSectorId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar setor");
    },
  });

  const deleteSectorMutation = trpc.sectors.delete.useMutation({
    onSuccess: () => {
      toast.success("Setor deletado com sucesso!");
      utils.sectors.list.invalidate();
      setSectorDialogMode("closed");
      setSelectedSectorId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar setor");
    },
  });

  // --- Import/Export ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { sectorsCreated: number; sectorsSkipped: number; peopleCreated: number; peopleSkipped: number };
    errors: string[];
  } | null>(null);

  const handleDownloadTemplate = async () => {
    if (!effectiveCompanyId) {
      toast.error("Nenhuma empresa selecionada");
      return;
    }
    try {
      const response = await fetch(`/api/template/people/${effectiveCompanyId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Erro ao baixar modelo");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo_colaboradores.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Modelo baixado com sucesso!");
    } catch {
      toast.error("Erro ao baixar o modelo da planilha");
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !effectiveCompanyId) {
      if (!effectiveCompanyId) toast.error("Nenhuma empresa selecionada");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/import/people/${effectiveCompanyId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao importar planilha");
      }

      setImportResult({ summary: data.summary, errors: data.errors });
      utils.people.list.invalidate();
      utils.sectors.list.invalidate();

      const msg = [
        data.summary.sectorsCreated > 0 ? `${data.summary.sectorsCreated} setor(es) criado(s)` : null,
        data.summary.peopleCreated > 0 ? `${data.summary.peopleCreated} colaborador(es) criado(s)` : null,
      ].filter(Boolean).join(", ");

      toast.success(msg || "Importação concluída (nenhum registro novo)");
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar planilha");
    } finally {
      setImporting(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- People handlers ---
  const handlePersonSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCompanyId) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    const formData = new FormData(e.currentTarget);
    createPersonMutation.mutate({
      sectorId: formData.get("sectorId") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      position: formData.get("position") as string,
    });
  };

  const handlePersonEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCompanyId || !selectedPersonId) return;

    const formData = new FormData(e.currentTarget);
    updatePersonMutation.mutate({
      id: selectedPersonId,
      sectorId: formData.get("sectorId") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      position: formData.get("position") as string,
    });
  };

  // --- Sectors handlers ---
  const handleSectorSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCompanyId) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    const formData = new FormData(e.currentTarget);
    createSectorMutation.mutate({
      name: formData.get("sectorName") as string,
      description: formData.get("description") as string,
      responsibleName: formData.get("responsibleName") as string,
    });
  };

  const handleSectorEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!effectiveCompanyId || !selectedSectorId) return;

    const formData = new FormData(e.currentTarget);
    updateSectorMutation.mutate({
      id: selectedSectorId,
      name: formData.get("sectorName") as string,
      description: formData.get("description") as string,
      responsibleName: formData.get("responsibleName") as string,
    });
  };

  const selectedPerson = people?.find(p => p.id === selectedPersonId);
  const selectedSector = sectors?.find(s => s.id === selectedSectorId);

  if (!effectiveCompanyId) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa no menu lateral para visualizar e gerenciar
            seus colaboradores e setores
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Colaboradores e Setores</h1>
            <p className="text-muted-foreground">
              Gerencie os colaboradores e setores de{" "}
              <span className="font-semibold">{effectiveCompanyName}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Modelo
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {importing ? "Importando..." : "Importar Planilha"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods,.tsv"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        </div>

        <Tabs defaultValue="colaboradores" className="w-full">
          <TabsList>
            <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
            <TabsTrigger value="setores">Setores</TabsTrigger>
          </TabsList>

          {/* ====== TAB: Colaboradores ====== */}
          <TabsContent value="colaboradores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setPeopleDialogMode("create")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Colaboradores Cadastrados</CardTitle>
                <CardDescription>
                  {peopleLoading
                    ? "Carregando..."
                    : `${people?.length || 0} colaborador(es) encontrado(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {peopleLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : people && people.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {people.map(person => (
                        <TableRow key={person.id}>
                          <TableCell className="font-medium">
                            {person.name}
                          </TableCell>
                          <TableCell>{person.sectorName || "-"}</TableCell>
                          <TableCell>{person.position}</TableCell>
                          <TableCell>{person.email || "-"}</TableCell>
                          <TableCell>{person.phone || "-"}</TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPersonId(person.id);
                                setPeopleDialogMode("edit");
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedPersonId(person.id);
                                setPeopleDialogMode("delete");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">
                      Nenhum colaborador cadastrado
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Comece criando o primeiro colaborador para{" "}
                      {effectiveCompanyName}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ====== TAB: Setores ====== */}
          <TabsContent value="setores" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setSectorDialogMode("create")}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Setor
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Setores Cadastrados</CardTitle>
                <CardDescription>
                  {sectorsLoading
                    ? "Carregando..."
                    : `${sectors?.length || 0} setor(es) encontrado(s)`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sectorsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : sectors && sectors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Gestor</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map(sector => (
                        <TableRow key={sector.id}>
                          <TableCell className="font-medium">
                            {sector.name}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {sector.description || "-"}
                          </TableCell>
                          <TableCell>{sector.responsibleName || "-"}</TableCell>
                          <TableCell>
                            {sector.createdAt
                              ? new Date(sector.createdAt).toLocaleDateString(
                                  "pt-BR"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSectorId(sector.id);
                                setSectorDialogMode("edit");
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedSectorId(sector.id);
                                setSectorDialogMode("delete");
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserSquare2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">
                      Nenhum setor cadastrado
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Comece criando o primeiro setor para {effectiveCompanyName}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ====== People Dialogs ====== */}
        <Dialog
          open={peopleDialogMode === "create" || peopleDialogMode === "edit"}
          onOpenChange={open => {
            if (!open) setPeopleDialogMode("closed");
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form
              onSubmit={
                peopleDialogMode === "create" ? handlePersonSubmit : handlePersonEditSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  {peopleDialogMode === "create"
                    ? "Novo Colaborador"
                    : "Editar Colaborador"}
                </DialogTitle>
                <DialogDescription>
                  {peopleDialogMode === "create"
                    ? `Cadastre um novo colaborador para ${effectiveCompanyName}`
                    : `Atualize os dados do colaborador ${selectedPerson?.name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Nome completo do colaborador"
                    defaultValue={
                      peopleDialogMode === "edit" ? selectedPerson?.name : ""
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sectorId">Setor *</Label>
                  <Select
                    name="sectorId"
                    defaultValue={
                      peopleDialogMode === "edit" && selectedPerson?.sectorId
                        ? selectedPerson.sectorId
                        : ""
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectors?.map(sector => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="position">Cargo *</Label>
                  <Input
                    id="position"
                    name="position"
                    placeholder="Ex: Analista, Gerente, Operador"
                    defaultValue={
                      peopleDialogMode === "edit" && selectedPerson?.position
                        ? selectedPerson.position
                        : ""
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      defaultValue={
                        peopleDialogMode === "edit"
                          ? (selectedPerson?.email ?? "")
                          : ""
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      placeholder="(00) 00000-0000"
                      defaultValue={
                        peopleDialogMode === "edit"
                          ? (selectedPerson?.phone ?? "")
                          : ""
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPeopleDialogMode("closed")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    peopleDialogMode === "create"
                      ? createPersonMutation.isPending
                      : updatePersonMutation.isPending
                  }
                >
                  {peopleDialogMode === "create"
                    ? createPersonMutation.isPending
                      ? "Criando..."
                      : "Criar Colaborador"
                    : updatePersonMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={peopleDialogMode === "delete"}
          onOpenChange={open => {
            if (!open) setPeopleDialogMode("closed");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o colaborador{" "}
                <strong>{selectedPerson?.name}</strong>? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setPeopleDialogMode("closed")}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedPersonId) {
                    deletePersonMutation.mutate({
                      id: selectedPersonId,
                    });
                  }
                }}
                disabled={deletePersonMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deletePersonMutation.isPending ? "Deletando..." : "Deletar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* ====== Sectors Dialogs ====== */}
        <Dialog
          open={sectorDialogMode === "create" || sectorDialogMode === "edit"}
          onOpenChange={open => {
            if (!open) setSectorDialogMode("closed");
          }}
        >
          <DialogContent className="max-w-xl">
            <form
              onSubmit={
                sectorDialogMode === "create" ? handleSectorSubmit : handleSectorEditSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  {sectorDialogMode === "create" ? "Novo Setor" : "Editar Setor"}
                </DialogTitle>
                <DialogDescription>
                  {sectorDialogMode === "create"
                    ? `Cadastre um novo setor para ${effectiveCompanyName}`
                    : `Atualize os dados do setor ${selectedSector?.name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="sectorName">Nome do Setor *</Label>
                  <Input
                    id="sectorName"
                    name="sectorName"
                    placeholder="Ex: Administrativo, Produção, Comercial"
                    defaultValue={
                      sectorDialogMode === "edit" ? selectedSector?.name : ""
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva as atividades e responsabilidades do setor..."
                    defaultValue={
                      sectorDialogMode === "edit"
                        ? (selectedSector?.description ?? "")
                        : ""
                    }
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="responsibleName">
                    Responsável pelo Setor
                  </Label>
                  <Input
                    id="responsibleName"
                    name="responsibleName"
                    placeholder="Nome do responsável pelo setor"
                    defaultValue={
                      sectorDialogMode === "edit"
                        ? (selectedSector?.responsibleName ?? "")
                        : ""
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSectorDialogMode("closed")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    sectorDialogMode === "create"
                      ? createSectorMutation.isPending
                      : updateSectorMutation.isPending
                  }
                >
                  {sectorDialogMode === "create"
                    ? createSectorMutation.isPending
                      ? "Criando..."
                      : "Criar Setor"
                    : updateSectorMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={sectorDialogMode === "delete"}
          onOpenChange={open => {
            if (!open) setSectorDialogMode("closed");
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o setor{" "}
                <strong>{selectedSector?.name}</strong>? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setSectorDialogMode("closed")}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedSectorId) {
                    deleteSectorMutation.mutate({
                      id: selectedSectorId,
                    });
                  }
                }}
                disabled={deleteSectorMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteSectorMutation.isPending ? "Deletando..." : "Deletar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* ====== Import Result Dialog ====== */}
        <Dialog
          open={importResult !== null}
          onOpenChange={open => {
            if (!open) setImportResult(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Resultado da Importação</DialogTitle>
              <DialogDescription>
                Resumo dos registros processados
              </DialogDescription>
            </DialogHeader>
            {importResult && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {importResult.summary.sectorsCreated}
                    </p>
                    <p className="text-xs text-muted-foreground">Setores criados</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {importResult.summary.peopleCreated}
                    </p>
                    <p className="text-xs text-muted-foreground">Colaboradores criados</p>
                  </div>
                </div>
                {importResult.summary.sectorsSkipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {importResult.summary.sectorsSkipped} setor(es) já existente(s) ignorado(s)
                  </p>
                )}
                {importResult.summary.peopleSkipped > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {importResult.summary.peopleSkipped} linha(s) de colaborador ignorada(s)
                  </p>
                )}
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Avisos ({importResult.errors.length}):
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.map((err, idx) => (
                        <li key={idx}>• {err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setImportResult(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
