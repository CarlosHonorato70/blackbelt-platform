import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Edit2, Trash2, Search, Building2 } from "lucide-react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

const sizeLabels: Record<string, string> = {
  micro: "MEI/Micro",
  small: "Pequena",
  medium: "Média",
  large: "Grande",
};

export default function Clients() {
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companySizeValue, setCompanySizeValue] = useState("micro");
  const [statusValue, setStatusValue] = useState("active");

  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.clients.list.useQuery();

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Cliente criado com sucesso!");
      utils.clients.list.invalidate();
      setDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar cliente");
    },
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      utils.clients.list.invalidate();
      setDialogMode("closed");
      setSelectedClientId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cliente");
    },
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Cliente deletado com sucesso!");
      utils.clients.list.invalidate();
      setDialogMode("closed");
      setSelectedClientId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar cliente");
    },
  });

  const selectedClient = useMemo(
    () => clients?.find((c: any) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c: any) => {
      const matchesSearch =
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.cnpj || "").includes(search) ||
        (c.contactName || "").toLowerCase().includes(search.toLowerCase()) ||
        (c.contactEmail || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || (c.status || "active") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const openCreate = () => {
    setCompanySizeValue("micro");
    setStatusValue("active");
    setDialogMode("create");
  };

  const openEdit = (client: any) => {
    setSelectedClientId(client.id);
    setCompanySizeValue(client.companySize || "micro");
    setStatusValue(client.status || "active");
    setDialogMode("edit");
  };

  const openDelete = (client: any) => {
    setSelectedClientId(client.id);
    setDialogMode("delete");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    createMutation.mutate({
      name: fd.get("name") as string,
      cnpj: (fd.get("cnpj") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      companySize: companySizeValue || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
      street: (fd.get("street") as string) || undefined,
      number: (fd.get("number") as string) || undefined,
      complement: (fd.get("complement") as string) || undefined,
      neighborhood: (fd.get("neighborhood") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      state: (fd.get("state") as string) || undefined,
      zipCode: (fd.get("zipCode") as string) || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClientId) return;
    const fd = new FormData(e.currentTarget);

    updateMutation.mutate({
      id: selectedClientId,
      name: fd.get("name") as string,
      cnpj: (fd.get("cnpj") as string) || undefined,
      industry: (fd.get("industry") as string) || undefined,
      companySize: companySizeValue || undefined,
      contactName: (fd.get("contactName") as string) || undefined,
      contactEmail: (fd.get("contactEmail") as string) || undefined,
      contactPhone: (fd.get("contactPhone") as string) || undefined,
      street: (fd.get("street") as string) || undefined,
      number: (fd.get("number") as string) || undefined,
      complement: (fd.get("complement") as string) || undefined,
      neighborhood: (fd.get("neighborhood") as string) || undefined,
      city: (fd.get("city") as string) || undefined,
      state: (fd.get("state") as string) || undefined,
      zipCode: (fd.get("zipCode") as string) || undefined,
      status: statusValue,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie sua base de clientes para propostas comerciais
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou contato..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""} encontrado{filteredClients.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Porte</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: any) => (
                      <TableRow key={client.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{client.name}</span>
                            {client.industry && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {client.industry}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {client.cnpj || "—"}
                        </TableCell>
                        <TableCell>
                          {client.companySize ? (
                            <Badge variant="outline">
                              {sizeLabels[client.companySize] || client.companySize}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="text-sm">
                              {client.contactName || "—"}
                            </span>
                            {client.contactEmail && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {client.contactEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.city && client.state
                            ? `${client.city}/${client.state}`
                            : client.city || client.state || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              (client.status || "active") === "active"
                                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }
                          >
                            {(client.status || "active") === "active"
                              ? "Ativo"
                              : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(client)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhum cliente cadastrado
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Adicione clientes para criar propostas comerciais
                </p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Cliente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog
          open={dialogMode === "create" || dialogMode === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode("closed");
              setSelectedClientId(null);
            }
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
                    ? "Novo Cliente"
                    : "Editar Cliente"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Cadastre um novo cliente na plataforma"
                    : `Atualize os dados de "${selectedClient?.name}"`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Group 1 - Identification */}
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Identificação
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Razão social ou nome fantasia"
                    defaultValue={
                      dialogMode === "edit" ? selectedClient?.name : ""
                    }
                    key={dialogMode + (selectedClientId || "")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    name="cnpj"
                    placeholder="00.000.000/0000-00"
                    defaultValue={
                      dialogMode === "edit" ? selectedClient?.cnpj || "" : ""
                    }
                    key={`cnpj-${dialogMode}-${selectedClientId || ""}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Setor/Indústria</Label>
                    <Input
                      id="industry"
                      name="industry"
                      placeholder="Ex: Saúde, Construção, TI"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.industry || ""
                          : ""
                      }
                      key={`ind-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Porte da Empresa</Label>
                    <Select
                      value={companySizeValue}
                      onValueChange={setCompanySizeValue}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="micro">MEI/Micro</SelectItem>
                        <SelectItem value="small">Pequena</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="large">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Group 2 - Contact */}
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Contato Principal
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="contactName">Nome do Contato</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    placeholder="Nome completo"
                    defaultValue={
                      dialogMode === "edit"
                        ? selectedClient?.contactName || ""
                        : ""
                    }
                    key={`cn-${dialogMode}-${selectedClientId || ""}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">E-mail</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      placeholder="email@empresa.com"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.contactEmail || ""
                          : ""
                      }
                      key={`ce-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone">Telefone</Label>
                    <Input
                      id="contactPhone"
                      name="contactPhone"
                      placeholder="(00) 00000-0000"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.contactPhone || ""
                          : ""
                      }
                      key={`cp-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                </div>

                {/* Group 3 - Address */}
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Endereço
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      placeholder="00000-000"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.zipCode || ""
                          : ""
                      }
                      key={`zip-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="street">Logradouro</Label>
                    <Input
                      id="street"
                      name="street"
                      placeholder="Rua, Av., etc."
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.street || ""
                          : ""
                      }
                      key={`st-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      name="number"
                      placeholder="Nº"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.number || ""
                          : ""
                      }
                      key={`num-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      name="complement"
                      placeholder="Sala, Andar, etc."
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.complement || ""
                          : ""
                      }
                      key={`comp-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      placeholder="Bairro"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.neighborhood || ""
                          : ""
                      }
                      key={`nb-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Cidade"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.city || ""
                          : ""
                      }
                      key={`city-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="state">UF</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="SP"
                      maxLength={2}
                      className="uppercase"
                      defaultValue={
                        dialogMode === "edit"
                          ? selectedClient?.state || ""
                          : ""
                      }
                      key={`state-${dialogMode}-${selectedClientId || ""}`}
                    />
                  </div>
                </div>

                {/* Status (edit only) */}
                {dialogMode === "edit" && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={statusValue}
                        onValueChange={setStatusValue}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode("closed");
                    setSelectedClientId(null);
                  }}
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
                      : "Criar Cliente"
                    : updateMutation.isPending
                      ? "Salvando..."
                      : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete AlertDialog */}
        <AlertDialog
          open={dialogMode === "delete"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode("closed");
              setSelectedClientId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o cliente{" "}
                <strong>{selectedClient?.name}</strong>? Esta ação não pode ser
                desfeita. Propostas vinculadas a este cliente serão
                desassociadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel
                onClick={() => {
                  setDialogMode("closed");
                  setSelectedClientId(null);
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedClientId) {
                    deleteMutation.mutate({ id: selectedClientId });
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
