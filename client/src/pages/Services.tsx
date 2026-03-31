import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isActiveEdit, setIsActiveEdit] = useState(true);
  const [unitValue, setUnitValue] = useState("hour");

  // Pricing Parameters state
  const [pricingFormData, setPricingFormData] = useState({
    monthlyFixedCost: 0,
    laborCost: 0,
    productiveHoursPerMonth: 160,
    defaultTaxRegime: "MEI" as "MEI" | "SN" | "LP" | "autonomous",
    riskAdjustment: 0,
    seniorityAdjustment: 0,
  });

  const utils = trpc.useUtils();
  const { data: services, isLoading } = trpc.services.list.useQuery();
  const { data: pricingParameters, isLoading: isPricingLoading } = trpc.pricingParameters.get.useQuery();
  const pricingUpdateMutation = trpc.pricingParameters.update.useMutation();

  useEffect(() => {
    if (pricingParameters) {
      setPricingFormData({
        monthlyFixedCost: pricingParameters.monthlyFixedCost || 0,
        laborCost: pricingParameters.laborCost || 0,
        productiveHoursPerMonth: pricingParameters.productiveHoursPerMonth || 160,
        defaultTaxRegime: pricingParameters.defaultTaxRegime || "MEI",
        riskAdjustment: pricingParameters.riskAdjustment || 0,
        seniorityAdjustment: pricingParameters.seniorityAdjustment || 0,
      });
    }
  }, [pricingParameters]);

  const handlePricingSave = async () => {
    try {
      await pricingUpdateMutation.mutateAsync(pricingFormData);
      toast.success("Parâmetros de precificação atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar parâmetros");
    }
  };

  const calculateHourlyRate = () => {
    const totalCost = pricingFormData.monthlyFixedCost + pricingFormData.laborCost;
    const hourlyRate = totalCost / pricingFormData.productiveHoursPerMonth;
    return hourlyRate.toFixed(2);
  };

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
        <div>
          <h1 className="text-3xl font-bold">Serviços e Preços</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Serviços padrão da plataforma — consultorias recebem uma cópia editável automaticamente"
              : "Gerencie o catálogo de serviços e parâmetros de precificação"}
          </p>
        </div>

        {isAdmin && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-4 text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Admin Master:</strong> Os serviços cadastrados aqui são o catálogo padrão da plataforma. Novas consultorias recebem automaticamente uma cópia com estes preços, que podem ser ajustados individualmente. Os preços são usados para cálculo automático da proposta final no SamurAI.
          </div>
        )}

        <Tabs defaultValue="servicos" className="w-full">
          <TabsList>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="parametros">Parâmetros de Preço</TabsTrigger>
          </TabsList>

          <TabsContent value="servicos" className="space-y-6 mt-4">
            {/* Services action button */}
            <div className="flex justify-end">
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
          </TabsContent>

          <TabsContent value="parametros" className="space-y-6 mt-4">
            {isPricingLoading ? (
              <p className="text-center text-gray-500">Carregando...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Custos Operacionais</CardTitle>
                      <CardDescription>
                        Configure os custos mensais da empresa
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">
                          Custo Fixo Mensal (R$)
                        </label>
                        <Input
                          type="number"
                          value={pricingFormData.monthlyFixedCost}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              monthlyFixedCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ex: 5000"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Custo de Mão de Obra Mensal (R$)
                        </label>
                        <Input
                          type="number"
                          value={pricingFormData.laborCost}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              laborCost: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ex: 8000"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Horas Produtivas por Mês
                        </label>
                        <Input
                          type="number"
                          value={pricingFormData.productiveHoursPerMonth}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              productiveHoursPerMonth:
                                parseFloat(e.target.value) || 160,
                            })
                          }
                          placeholder="Ex: 160"
                        />
                      </div>

                      <div className="bg-blue-50 p-4 rounded">
                        <p className="text-sm text-gray-600">Valor da Hora Técnica</p>
                        <p className="text-2xl font-bold text-blue-600">
                          R$ {calculateHourlyRate()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações Tributárias</CardTitle>
                      <CardDescription>
                        Configure regime tributário e ajustes
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">
                          Regime Tributário Padrão
                        </label>
                        <select
                          value={pricingFormData.defaultTaxRegime}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              defaultTaxRegime: e.target.value as
                                | "MEI"
                                | "SN"
                                | "LP"
                                | "autonomous",
                            })
                          }
                          className="w-full border rounded px-3 py-2"
                        >
                          <option value="MEI">
                            MEI (Microempreendedor Individual)
                          </option>
                          <option value="SN">SN (Simples Nacional)</option>
                          <option value="LP">LP (Lucro Presumido)</option>
                          <option value="autonomous">Autônomo</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Ajuste de Risco (%)
                        </label>
                        <Input
                          type="number"
                          value={pricingFormData.riskAdjustment}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              riskAdjustment: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ex: 10"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Percentual adicional para projetos com maior risco
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">
                          Ajuste de Senioridade (%)
                        </label>
                        <Input
                          type="number"
                          value={pricingFormData.seniorityAdjustment}
                          onChange={e =>
                            setPricingFormData({
                              ...pricingFormData,
                              seniorityAdjustment: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="Ex: 15"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Percentual adicional para consultores sênior
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Resumo de Configuração</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo Fixo Mensal:</span>
                      <span className="font-medium">
                        R$ {pricingFormData.monthlyFixedCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo de MO Mensal:</span>
                      <span className="font-medium">
                        R$ {pricingFormData.laborCost.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Custo Total Mensal:</span>
                      <span className="font-medium">
                        R$ {(pricingFormData.monthlyFixedCost + pricingFormData.laborCost).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Valor da Hora Técnica:</span>
                      <span className="font-bold text-lg">
                        R$ {calculateHourlyRate()}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handlePricingSave} size="lg" className="w-full">
                  Salvar Parâmetros
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
