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
  DialogTrigger,
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
import { trpc } from "@/lib/trpc";
import { Building2, Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

export default function Tenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      toast.success("Empresa criada com sucesso!");
      utils.tenants.list.invalidate();
      setDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar empresa");
    },
  });

  const updateMutation = trpc.tenants.update.useMutation({
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso!");
      utils.tenants.list.invalidate();
      setDialogMode("closed");
      setSelectedTenantId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar empresa");
    },
  });

  const deleteMutation = trpc.tenants.delete.useMutation({
    onSuccess: () => {
      toast.success("Empresa deletada com sucesso!");
      utils.tenants.list.invalidate();
      setDialogMode("closed");
      setSelectedTenantId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar empresa");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createMutation.mutate({
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      street: formData.get("street") as string,
      number: formData.get("number") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zipCode: formData.get("zipCode") as string,
      contactName: formData.get("contactName") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      strategy: "shared_rls",
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTenantId) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedTenantId,
      name: formData.get("name") as string,
      street: formData.get("street") as string,
      number: formData.get("number") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zipCode: formData.get("zipCode") as string,
      contactName: formData.get("contactName") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
    });
  };

  const selectedTenant = tenants?.find(t => t.id === selectedTenantId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
            <p className="text-muted-foreground">
              Gerencie as empresas clientes da plataforma
            </p>
          </div>

          <Button onClick={() => setDialogMode("create")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Busque e filtre as empresas cadastradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empresas Cadastradas</CardTitle>
            <CardDescription>
              {tenants?.length || 0} empresa(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : tenants && tenants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map(tenant => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      <TableCell>{tenant.cnpj}</TableCell>
                      <TableCell>
                        {tenant.city && tenant.state
                          ? `${tenant.city}/${tenant.state}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {tenant.contactName || tenant.contactEmail || "-"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.status === "active"
                              ? "bg-green-100 text-green-800"
                              : tenant.status === "inactive"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tenant.status === "active"
                            ? "Ativo"
                            : tenant.status === "inactive"
                              ? "Inativo"
                              : "Suspenso"}
                        </span>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTenantId(tenant.id);
                            setDialogMode("edit");
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedTenantId(tenant.id);
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
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhuma empresa encontrada
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando uma nova empresa cliente
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
                  {dialogMode === "create" ? "Nova Empresa" : "Editar Empresa"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Cadastre uma nova empresa cliente na plataforma"
                    : `Atualize os dados da empresa ${selectedTenant?.name}`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={
                      dialogMode === "edit" ? selectedTenant?.name : ""
                    }
                    required
                  />
                </div>

                {dialogMode === "create" && (
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input
                      id="street"
                      name="street"
                      defaultValue={
                        dialogMode === "edit"
                          ? (selectedTenant?.street ?? "")
                          : ""
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      name="number"
                      defaultValue={
                        dialogMode === "edit"
                          ? (selectedTenant?.number ?? "")
                          : ""
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      defaultValue={
                        dialogMode === "edit"
                          ? (selectedTenant?.city ?? "")
                          : ""
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      name="state"
                      maxLength={2}
                      defaultValue={
                        dialogMode === "edit"
                          ? (selectedTenant?.state ?? "")
                          : ""
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    placeholder="00000-000"
                    defaultValue={
                      dialogMode === "edit"
                        ? (selectedTenant?.zipCode ?? "")
                        : ""
                    }
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Contato Principal</h3>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contactName">Nome</Label>
                      <Input
                        id="contactName"
                        name="contactName"
                        defaultValue={
                          dialogMode === "edit"
                            ? (selectedTenant?.contactName ?? "")
                            : ""
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactEmail">E-mail</Label>
                      <Input
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        defaultValue={
                          dialogMode === "edit"
                            ? (selectedTenant?.contactEmail ?? "")
                            : ""
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="contactPhone">Telefone</Label>
                      <Input
                        id="contactPhone"
                        name="contactPhone"
                        defaultValue={
                          dialogMode === "edit"
                            ? (selectedTenant?.contactPhone ?? "")
                            : ""
                        }
                      />
                    </div>
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
                      : "Criar Empresa"
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
                Tem certeza que deseja deletar a empresa{" "}
                <strong>{selectedTenant?.name}</strong>? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setDialogMode("closed")}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedTenantId) {
                    deleteMutation.mutate({ id: selectedTenantId });
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
