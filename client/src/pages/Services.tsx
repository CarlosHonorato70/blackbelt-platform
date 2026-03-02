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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Edit2, Trash2, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

const unitLabels: Record<string, string> = {
  hour: "Hora",
  day: "Dia",
  project: "Projeto",
  month: "Mês",
};

export default function Services() {
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isActiveEdit, setIsActiveEdit] = useState(true);
  const [unitValue, setUnitValue] = useState("hour");

  const utils = trpc.useUtils();
  const { data: services, isLoading } = trpc.services.list.useQuery();

  const createMutation = trpc.services.create.useMutation({
    onSuccess: () => {
      toast.success("Serviço criado com sucesso!");
      utils.services.list.invalidate();
      setDialogMode("closed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar serviço");
    },
  });

  const updateMutation = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Serviço atualizado com sucesso!");
      utils.services.list.invalidate();
      setDialogMode("closed");
      setSelectedServiceId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar serviço");
    },
  });

  const deleteMutation = trpc.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Serviço deletado com sucesso!");
      utils.services.list.invalidate();
      setDialogMode("closed");
      setSelectedServiceId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar serviço");
    },
  });

  const selectedService = useMemo(
    () => services?.find((s: any) => s.id === selectedServiceId),
    [services, selectedServiceId]
  );

  const uniqueCategories = useMemo(() => {
    if (!services) return [];
    const cats = new Set(services.map((s: any) => s.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [services]);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    return services.filter((s: any) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.category || "").toLowerCase().includes(search.toLowerCase()) ||
        (s.description || "").toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [services, search, categoryFilter]);

  const openEdit = (service: any) => {
    setSelectedServiceId(service.id);
    setIsActiveEdit(service.isActive ?? true);
    setUnitValue(service.unit || "hour");
    setDialogMode("edit");
  };

  const openDelete = (service: any) => {
    setSelectedServiceId(service.id);
    setDialogMode("delete");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const minPrice = parseFloat(formData.get("minPrice") as string) || 0;
    const maxPrice = parseFloat(formData.get("maxPrice") as string) || 0;

    if (minPrice > maxPrice) {
      toast.error("Preço mínimo não pode ser maior que o máximo");
      return;
    }

    createMutation.mutate({
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      unit: unitValue as "hour" | "day" | "project" | "month",
      minPrice,
      maxPrice,
      description: (formData.get("description") as string) || undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedServiceId) return;
    const formData = new FormData(e.currentTarget);
    const minPrice = parseFloat(formData.get("minPrice") as string) || 0;
    const maxPrice = parseFloat(formData.get("maxPrice") as string) || 0;

    if (minPrice > maxPrice) {
      toast.error("Preço mínimo não pode ser maior que o máximo");
      return;
    }

    updateMutation.mutate({
      id: selectedServiceId,
      name: formData.get("name") as string,
      category: formData.get("category") as string,
      unit: unitValue as "hour" | "day" | "project" | "month",
      minPrice,
      maxPrice,
      description: (formData.get("description") as string) || undefined,
      isActive: isActiveEdit,
    });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Serviços</h1>
            <p className="text-muted-foreground">
              Gerencie o catálogo de serviços e precificação
            </p>
          </div>
          <Button onClick={() => { setUnitValue("hour"); setDialogMode("create"); }}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou categoria..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Serviços</CardTitle>
            <CardDescription>
              {filteredServices.length} serviço{filteredServices.length !== 1 ? "s" : ""} encontrado{filteredServices.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredServices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Faixa de Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service: any) => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{service.name}</span>
                            {service.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {service.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{service.category || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {unitLabels[service.unit] || service.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(service.minPrice)} — {formatCurrency(service.maxPrice)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              service.isActive !== false
                                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }
                          >
                            {service.isActive !== false ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(service)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => openDelete(service)}
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
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum serviço cadastrado</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando seu primeiro serviço para precificação
                </p>
                <Button className="mt-4" onClick={() => { setUnitValue("hour"); setDialogMode("create"); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Serviço
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
              setSelectedServiceId(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <form onSubmit={dialogMode === "create" ? handleSubmit : handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Novo Serviço" : "Editar Serviço"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create"
                    ? "Cadastre um novo serviço ao catálogo de precificação"
                    : `Atualize os dados do serviço "${selectedService?.name}"`}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Serviço *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="Ex: Consultoria em Segurança do Trabalho"
                    defaultValue={dialogMode === "edit" ? selectedService?.name : ""}
                    key={dialogMode + (selectedServiceId || "")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Input
                    id="category"
                    name="category"
                    required
                    placeholder="Ex: Consultoria, Treinamento, Diagnóstico"
                    defaultValue={dialogMode === "edit" ? selectedService?.category : ""}
                    key={`cat-${dialogMode}-${selectedServiceId || ""}`}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Unidade de Cobrança *</Label>
                  <Select
                    value={unitValue}
                    onValueChange={setUnitValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hour">Hora</SelectItem>
                      <SelectItem value="day">Dia</SelectItem>
                      <SelectItem value="project">Projeto</SelectItem>
                      <SelectItem value="month">Mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="minPrice">Preço Mínimo (R$) *</Label>
                    <Input
                      id="minPrice"
                      name="minPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      defaultValue={dialogMode === "edit" ? selectedService?.minPrice : 0}
                      key={`min-${dialogMode}-${selectedServiceId || ""}`}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxPrice">Preço Máximo (R$) *</Label>
                    <Input
                      id="maxPrice"
                      name="maxPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      defaultValue={dialogMode === "edit" ? selectedService?.maxPrice : 0}
                      key={`max-${dialogMode}-${selectedServiceId || ""}`}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Descreva o escopo deste serviço..."
                    defaultValue={dialogMode === "edit" ? (selectedService?.description ?? "") : ""}
                    key={`desc-${dialogMode}-${selectedServiceId || ""}`}
                  />
                </div>

                {dialogMode === "edit" && (
                  <div className="flex items-center gap-3 pt-2 border-t">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={isActiveEdit}
                      onChange={(e) => setIsActiveEdit(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer">
                      Serviço ativo
                    </Label>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode("closed");
                    setSelectedServiceId(null);
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
                      : "Criar Serviço"
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
              setSelectedServiceId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar o serviço{" "}
                <strong>{selectedService?.name}</strong>? Esta ação não pode ser
                desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel
                onClick={() => {
                  setDialogMode("closed");
                  setSelectedServiceId(null);
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedServiceId) {
                    deleteMutation.mutate({ id: selectedServiceId });
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
