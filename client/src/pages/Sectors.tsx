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
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Edit2, Plus, Trash2, UserSquare2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

export default function Sectors() {
  const { selectedTenant } = useTenant();
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: sectors, isLoading } = trpc.sectors.list.useQuery(
    undefined,
    { enabled: !!selectedTenant }
  );

  const createMutation = trpc.sectors.create.useMutation({
    onSuccess: () => {
      toast.success("Setor criado com sucesso!");
      utils.sectors.list.invalidate();
      setDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar setor");
    },
  });

  const updateMutation = trpc.sectors.update.useMutation({
    onSuccess: () => {
      toast.success("Setor atualizado com sucesso!");
      utils.sectors.list.invalidate();
      setDialogMode("closed");
      setSelectedSectorId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar setor");
    },
  });

  const deleteMutation = trpc.sectors.delete.useMutation({
    onSuccess: () => {
      toast.success("Setor deletado com sucesso!");
      utils.sectors.list.invalidate();
      setDialogMode("closed");
      setSelectedSectorId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar setor");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenant) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }

    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      responsibleName: formData.get("responsibleName") as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenant || !selectedSectorId) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedSectorId,
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      responsibleName: formData.get("responsibleName") as string,
    });
  };

  const selectedSector = sectors?.find(s => s.id === selectedSectorId);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa no menu lateral para visualizar e gerenciar
            seus setores
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Setores</h1>
            <p className="text-muted-foreground">
              Gerencie os setores de{" "}
              <span className="font-semibold">{selectedTenant.name}</span>
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Setor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Novo Setor</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo setor para {selectedTenant.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome do Setor *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Administrativo, Produção, Comercial"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Descreva as atividades e responsabilidades do setor..."
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
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Setor"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setDialogMode("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Setor
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setores Cadastrados</CardTitle>
            <CardDescription>
              {isLoading
                ? "Carregando..."
                : `${sectors?.length || 0} setor(es) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                            setDialogMode("edit");
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedSectorId(sector.id);
                            setDialogMode("delete");
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
                  Comece criando o primeiro setor para {selectedTenant.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog para Criar/Editar */}
        <Dialog
          open={dialogMode === "create" || dialogMode === "edit"}
          onOpenChange={open => {
            if (!open) setDialogMode("closed");
          }}
        >
          <DialogContent className="max-w-xl">
            <form
              onSubmit={
                dialogMode === "create" ? handleSubmit : handleEditSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Novo Setor" : "Editar Setor"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? `Cadastre um novo setor para ${selectedTenant.name}`
                    : `Atualize os dados do setor ${selectedSector?.name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Setor *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ex: Administrativo, Produção, Comercial"
                    defaultValue={
                      dialogMode === "edit" ? selectedSector?.name : ""
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
                      dialogMode === "edit"
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
                      dialogMode === "edit"
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
                  onClick={() => setDialogMode("closed")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    dialogMode === "create"
                      ? createMutation.isPending
                      : updateMutation.isPending
                  }
                >
                  {dialogMode === "create"
                    ? createMutation.isPending
                      ? "Criando..."
                      : "Criar Setor"
                    : updateMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* AlertDialog para Deletar */}
        <AlertDialog
          open={dialogMode === "delete"}
          onOpenChange={open => {
            if (!open) setDialogMode("closed");
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
              <AlertDialogCancel onClick={() => setDialogMode("closed")}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedSectorId) {
                    deleteMutation.mutate({
                      id: selectedSectorId,
                    });
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Deletando..." : "Deletar"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
