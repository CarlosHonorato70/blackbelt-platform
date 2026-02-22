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
import { Plus, Edit2, Trash2, Search, FileText, X } from "lucide-react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Rascunho",
    className: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
  },
  sent: {
    label: "Enviada",
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  accepted: {
    label: "Aceita",
    className:
      "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
  rejected: {
    label: "Recusada",
    className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  },
  expired: {
    label: "Expirada",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
  },
};

const taxRegimeLabels: Record<string, string> = {
  MEI: "MEI",
  SN: "Simples Nacional",
  LP: "Lucro Presumido",
  autonomous: "Autônomo",
};

const taxRates: Record<string, number> = {
  MEI: 0.05,
  SN: 0.08,
  LP: 0.15,
  autonomous: 0.2,
};

interface ProposalItem {
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number; // in cents
}

export default function Proposals() {
  const [dialogMode, setDialogMode] = useState<DialogMode>("closed");
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create dialog state
  const [clientIdValue, setClientIdValue] = useState("");
  const [taxRegimeValue, setTaxRegimeValue] = useState<string>("MEI");
  const [proposalItems, setProposalItems] = useState<ProposalItem[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  // Edit dialog state
  const [editStatusValue, setEditStatusValue] = useState("draft");

  const utils = trpc.useUtils();
  const { data: proposals, isLoading } = trpc.proposals.list.useQuery({});
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: services } = trpc.services.list.useQuery();

  const selectedProposalData = trpc.proposals.getById.useQuery(
    { id: selectedProposalId! },
    { enabled: dialogMode === "edit" && !!selectedProposalId }
  );

  const createMutation = trpc.proposals.create.useMutation();
  const addItemMutation = trpc.proposals.addItem.useMutation();
  const updateMutation = trpc.proposals.update.useMutation({
    onSuccess: () => {
      toast.success("Proposta atualizada com sucesso!");
      utils.proposals.list.invalidate();
      setDialogMode("closed");
      setSelectedProposalId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar proposta");
    },
  });

  const deleteMutation = trpc.proposals.delete.useMutation({
    onSuccess: () => {
      toast.success("Proposta deletada com sucesso!");
      utils.proposals.list.invalidate();
      setDialogMode("closed");
      setSelectedProposalId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao deletar proposta");
    },
  });

  const selectedProposal = useMemo(
    () => proposals?.find((p: any) => p.id === selectedProposalId),
    [proposals, selectedProposalId]
  );

  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    return proposals.filter((p: any) => {
      const client = clients?.find((c: any) => c.id === p.clientId);
      const matchesSearch =
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (client?.name || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || (p.status || "draft") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, clients, search, statusFilter]);

  const itemsSubtotal = useMemo(
    () => proposalItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [proposalItems]
  );

  const itemsTaxes = useMemo(
    () => Math.round(itemsSubtotal * (taxRates[taxRegimeValue] || 0.05)),
    [itemsSubtotal, taxRegimeValue]
  );

  const itemsTotal = itemsSubtotal + itemsTaxes;

  const formatCurrency = (valueInCents: number) =>
    (valueInCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const openCreate = () => {
    setClientIdValue("");
    setTaxRegimeValue("MEI");
    setProposalItems([]);
    setSelectedServiceId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
    setDialogMode("create");
  };

  const openEdit = (proposal: any) => {
    setSelectedProposalId(proposal.id);
    setEditStatusValue(proposal.status || "draft");
    setDialogMode("edit");
  };

  const openDelete = (proposal: any) => {
    setSelectedProposalId(proposal.id);
    setDialogMode("delete");
  };

  const handleAddItem = () => {
    if (!selectedServiceId) {
      toast.error("Selecione um serviço");
      return;
    }
    if (itemQuantity < 1) {
      toast.error("Quantidade deve ser ao menos 1");
      return;
    }

    const service = services?.find((s: any) => s.id === selectedServiceId);
    if (!service) return;

    const unitPriceCents =
      itemUnitPrice > 0
        ? Math.round(itemUnitPrice * 100)
        : service.minPrice * 100;

    setProposalItems([
      ...proposalItems,
      {
        serviceId: selectedServiceId,
        serviceName: service.name,
        quantity: itemQuantity,
        unitPrice: unitPriceCents,
      },
    ]);

    setSelectedServiceId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
  };

  const handleRemoveItem = (index: number) => {
    setProposalItems(proposalItems.filter((_, i) => i !== index));
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    if (!clientIdValue) {
      toast.error("Selecione um cliente");
      return;
    }
    if (proposalItems.length === 0) {
      toast.error("Adicione ao menos um item à proposta");
      return;
    }

    const title = fd.get("title") as string;
    const description = (fd.get("description") as string) || undefined;
    const validUntilStr = fd.get("validUntil") as string;
    const validUntil = validUntilStr ? new Date(validUntilStr) : undefined;

    setIsCreating(true);
    try {
      const result = await createMutation.mutateAsync({
        clientId: clientIdValue,
        title,
        description,
        taxRegime: taxRegimeValue as "MEI" | "SN" | "LP" | "autonomous",
        subtotal: itemsSubtotal,
        discount: 0,
        discountPercent: 0,
        taxes: itemsTaxes,
        totalValue: itemsTotal,
        validUntil,
      });

      // Add items sequentially
      if (result?.id) {
        for (const item of proposalItems) {
          await addItemMutation.mutateAsync({
            proposalId: result.id,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.quantity * item.unitPrice,
          });
        }
      }

      toast.success("Proposta criada com sucesso!");
      utils.proposals.list.invalidate();
      setDialogMode("closed");
      setProposalItems([]);
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar proposta");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProposalId) return;
    const fd = new FormData(e.currentTarget);
    const title = fd.get("title") as string;
    const description = (fd.get("description") as string) || undefined;
    const validUntilStr = fd.get("validUntil") as string;
    const validUntil = validUntilStr ? new Date(validUntilStr) : undefined;

    updateMutation.mutate({
      id: selectedProposalId,
      title,
      description,
      status: editStatusValue as
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired",
      validUntil,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Propostas</h1>
            <p className="text-muted-foreground">
              Crie e gerencie propostas comerciais
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Proposta
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="accepted">Aceita</SelectItem>
                  <SelectItem value="rejected">Recusada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Propostas</CardTitle>
            <CardDescription>
              {filteredProposals.length} proposta
              {filteredProposals.length !== 1 ? "s" : ""} encontrada
              {filteredProposals.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredProposals.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proposta</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Regime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProposals.map((proposal: any) => {
                      const client = clients?.find(
                        (c: any) => c.id === proposal.clientId
                      );
                      const status = statusConfig[proposal.status || "draft"];
                      return (
                        <TableRow key={proposal.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {proposal.title}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {client?.name || "Cliente não encontrado"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(proposal.totalValue || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {taxRegimeLabels[proposal.taxRegime] ||
                                proposal.taxRegime}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={status?.className || ""}>
                              {status?.label || proposal.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(proposal.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(proposal)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => openDelete(proposal)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhuma proposta criada
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Crie propostas comerciais para seus clientes
                </p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Proposta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CREATE Dialog */}
        <Dialog
          open={dialogMode === "create"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode("closed");
              setProposalItems([]);
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Nova Proposta</DialogTitle>
                <DialogDescription>
                  Crie uma proposta comercial com itens de serviço
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* Section 1 - Header */}
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados da Proposta
                </p>

                <div className="grid gap-2">
                  <Label>Cliente *</Label>
                  <Select
                    value={clientIdValue}
                    onValueChange={setClientIdValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                          {client.cnpj ? ` (${client.cnpj})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="title">Título da Proposta *</Label>
                  <Input
                    id="title"
                    name="title"
                    required
                    placeholder="Ex: Proposta de Consultoria NR-01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Regime Tributário</Label>
                    <Select
                      value={taxRegimeValue}
                      onValueChange={setTaxRegimeValue}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="SN">Simples Nacional</SelectItem>
                        <SelectItem value="LP">Lucro Presumido</SelectItem>
                        <SelectItem value="autonomous">Autônomo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="validUntil">Validade</Label>
                    <Input id="validUntil" name="validUntil" type="date" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={2}
                    placeholder="Descreva o escopo da proposta..."
                  />
                </div>

                {/* Section 2 - Items */}
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Itens da Proposta
                </p>

                <div className="rounded-lg border p-3 space-y-3">
                  <div className="grid gap-2">
                    <Label>Serviço</Label>
                    <Select
                      value={selectedServiceId}
                      onValueChange={(val) => {
                        setSelectedServiceId(val);
                        const svc = services?.find(
                          (s: any) => s.id === val
                        );
                        if (svc) {
                          setItemUnitPrice(svc.minPrice);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services?.map((service: any) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} (R$ {service.minPrice.toFixed(2)} —
                            R$ {service.maxPrice.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        value={itemQuantity}
                        onChange={(e) =>
                          setItemQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs">Preço Unitário (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={itemUnitPrice}
                        onChange={(e) =>
                          setItemUnitPrice(parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddItem}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                {/* Items list */}
                {proposalItems.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="w-[80px]">Qtd</TableHead>
                          <TableHead>Preço Unit.</TableHead>
                          <TableHead>Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposalItems.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-sm">
                              {item.serviceName}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Subtotal</span>
                    <span>{formatCurrency(itemsSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>
                      Impostos estimados (
                      {taxRegimeLabels[taxRegimeValue] || taxRegimeValue} —{" "}
                      {((taxRates[taxRegimeValue] || 0.05) * 100).toFixed(0)}%)
                    </span>
                    <span>{formatCurrency(itemsTaxes)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-primary text-lg mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(itemsTotal)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode("closed");
                    setProposalItems([]);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Criando..." : "Criar Proposta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT Dialog */}
        <Dialog
          open={dialogMode === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode("closed");
              setSelectedProposalId(null);
            }
          }}
        >
          <DialogContent className="max-w-lg">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Editar Proposta</DialogTitle>
                <DialogDescription>
                  Atualize os dados de &ldquo;{selectedProposal?.title}&rdquo;
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Título *</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    required
                    defaultValue={selectedProposal?.title || ""}
                    key={`title-${selectedProposalId}`}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    rows={2}
                    defaultValue={selectedProposal?.description || ""}
                    key={`desc-${selectedProposalId}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Status</Label>
                    <Select
                      value={editStatusValue}
                      onValueChange={setEditStatusValue}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="sent">Enviada</SelectItem>
                        <SelectItem value="accepted">Aceita</SelectItem>
                        <SelectItem value="rejected">Recusada</SelectItem>
                        <SelectItem value="expired">Expirada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-validUntil">Validade</Label>
                    <Input
                      id="edit-validUntil"
                      name="validUntil"
                      type="date"
                      defaultValue={
                        selectedProposal?.validUntil
                          ? new Date(selectedProposal.validUntil)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      key={`valid-${selectedProposalId}`}
                    />
                  </div>
                </div>

                {/* Read-only items */}
                {selectedProposalData.data?.items &&
                  selectedProposalData.data.items.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Itens da Proposta
                      </p>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Serviço</TableHead>
                              <TableHead className="w-[60px]">Qtd</TableHead>
                              <TableHead>Preço</TableHead>
                              <TableHead>Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedProposalData.data.items.map(
                              (item: any) => (
                                <TableRow key={item.id}>
                                  <TableCell className="text-sm">
                                    {item.serviceName}
                                  </TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>
                                    {formatCurrency(item.unitPrice)}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {formatCurrency(item.subtotal)}
                                  </TableCell>
                                </TableRow>
                              )
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}

                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Valor Total</span>
                    <span className="font-bold">
                      {formatCurrency(selectedProposal?.totalValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Regime</span>
                    <span>
                      {taxRegimeLabels[selectedProposal?.taxRegime] ||
                        selectedProposal?.taxRegime}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogMode("closed");
                    setSelectedProposalId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending
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
              setSelectedProposalId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar a proposta{" "}
                <strong>{selectedProposal?.title}</strong>? Todos os itens
                vinculados serão removidos. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel
                onClick={() => {
                  setDialogMode("closed");
                  setSelectedProposalId(null);
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedProposalId) {
                    deleteMutation.mutate({ id: selectedProposalId });
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
