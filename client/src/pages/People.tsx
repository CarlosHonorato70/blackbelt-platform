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
import { AlertCircle, Edit2, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

export default function People() {
  const { selectedTenant } = useTenant();
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: people, isLoading } = trpc.people.list.useQuery(
    undefined,
    { enabled: !!selectedTenant }
  );

  const { data: sectors } = trpc.sectors.list.useQuery(
    undefined,
    { enabled: !!selectedTenant }
  );

  const createMutation = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      utils.people.list.invalidate();
      setDialogMode("closed");
    },
    onError: error => {
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar colaborador");
    },
  });

  const updateMutation = trpc.people.update.useMutation({
    onSuccess: () => {
      toast.success("Colaborador atualizado com sucesso!");
      utils.people.list.invalidate();
      setDialogMode("closed");
      setSelectedPersonId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar colaborador");
    },
  });

  const deleteMutation = trpc.people.delete.useMutation({
    onSuccess: () => {
      toast.success("Colaborador deletado com sucesso!");
      utils.people.list.invalidate();
      setDialogMode("closed");
      setSelectedPersonId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar colaborador");
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
      sectorId: formData.get("sectorId") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      position: formData.get("position") as string,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenant || !selectedPersonId) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedPersonId,
      sectorId: formData.get("sectorId") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      position: formData.get("position") as string,
    });
  };

  const selectedPerson = people?.find(p => p.id === selectedPersonId);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa no menu lateral para visualizar e gerenciar
            seus colaboradores
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
            <h1 className="text-3xl font-bold tracking-tight">Colaboradores</h1>
            <p className="text-muted-foreground">
              Gerencie os colaboradores de{" "}
              <span className="font-semibold">{selectedTenant.name}</span>
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Colaborador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Novo Colaborador</DialogTitle>
                  <DialogDescription>
                    Cadastre um novo colaborador para {selectedTenant.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Nome completo do colaborador"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sectorId">Setor *</Label>
                    <Select name="sectorId" required>
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
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
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
                    {createMutation.isPending
                      ? "Criando..."
                      : "Criar Colaborador"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setDialogMode("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Colaboradores Cadastrados</CardTitle>
            <CardDescription>
              {isLoading
                ? "Carregando..."
                : `${people?.length || 0} colaborador(es) encontrado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                            setDialogMode("edit");
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedPersonId(person.id);
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
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhum colaborador cadastrado
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando o primeiro colaborador para{" "}
                  {selectedTenant.name}
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form
              onSubmit={
                dialogMode === "create" ? handleSubmit : handleEditSubmit
              }
            >
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create"
                    ? "Novo Colaborador"
                    : "Editar Colaborador"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? `Cadastre um novo colaborador para ${selectedTenant.name}`
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
                      dialogMode === "edit" ? selectedPerson?.name : ""
                    }
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sectorId">Setor *</Label>
                  <Select
                    name="sectorId"
                    defaultValue={
                      dialogMode === "edit" && selectedPerson?.sectorId
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
                      dialogMode === "edit" && selectedPerson?.position
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
                        dialogMode === "edit"
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
                        dialogMode === "edit"
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
                      : "Criar Colaborador"
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
                Tem certeza que deseja deletar o colaborador{" "}
                <strong>{selectedPerson?.name}</strong>? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setDialogMode("closed")}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedPersonId) {
                    deleteMutation.mutate({
                      id: selectedPersonId,
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
