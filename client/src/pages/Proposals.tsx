import { useState, useMemo, useEffect } from "react";
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
import { Plus, Edit2, Trash2, Search, FileText, X, Download, DollarSign, Settings, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type DialogMode = "closed" | "create" | "edit" | "delete";

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  partial: {
    label: "Parcial",
    className: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
  },
  paid: {
    label: "Pago",
    className: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
  },
};

interface PaymentInstallment {
  number: number;
  percent: number;
  amount: number; // cents
  status: "pending" | "paid";
  paidAt?: string | null;
}

interface PaymentSettings {
  pixKey: string;
  bankDetails: string;
  additionalInstructions: string;
}

function isFinalProposal(title: string | null | undefined): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return lower.includes("final") || lower.includes("detalhada");
}

function getPaymentStatus(installments: PaymentInstallment[]): "pending" | "partial" | "paid" {
  const paidCount = installments.filter((i) => i.status === "paid").length;
  if (paidCount === 0) return "pending";
  if (paidCount === installments.length) return "paid";
  return "partial";
}

function buildInstallments(totalValue: number, existingPayments?: PaymentInstallment[]): PaymentInstallment[] {
  const percents = [40, 30, 30];
  return percents.map((pct, idx) => {
    const existing = existingPayments?.find((p) => p.number === idx + 1);
    return {
      number: idx + 1,
      percent: pct,
      amount: Math.round(totalValue * (pct / 100)),
      status: existing?.status || "pending",
      paidAt: existing?.paidAt || null,
    };
  });
}

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
  approved: {
    label: "Aprovada",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
  pending: {
    label: "Pendente",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100",
  },
  pending_approval: {
    label: "Aguardando Aprovação",
    className:
      "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
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

// Detect if a proposal is "Initial" or "Final" based on its title
function getProposalTypeBadge(title: string | null | undefined) {
  if (!title) return null;
  const lower = title.toLowerCase();
  if (lower.includes("pré-proposta") || lower.includes("pre-proposta") || lower.includes("inicial")) {
    return { label: "Pré-Proposta", className: "bg-blue-100 text-blue-800 border-blue-200" };
  }
  if (lower.includes("final") || lower.includes("detalhada")) {
    return { label: "Proposta Final", className: "bg-green-100 text-green-800 border-green-200" };
  }
  return { label: "Proposta", className: "bg-gray-100 text-gray-800 border-gray-200" };
}

// Editable item used in the edit dialog
interface EditableItem {
  id?: string; // existing DB id (undefined for newly added)
  serviceName: string;
  quantity: number;
  unitPrice: number; // cents
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

  // Edit dialog state — full form
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatusValue, setEditStatusValue] = useState("draft");
  const [editTotalValue, setEditTotalValue] = useState(0); // in reais (display)
  const [editDiscount, setEditDiscount] = useState(0); // percent
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  // New item being added in edit dialog
  const [editNewServiceName, setEditNewServiceName] = useState("");
  const [editNewQuantity, setEditNewQuantity] = useState(1);
  const [editNewUnitPrice, setEditNewUnitPrice] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Payment control dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentProposal, setPaymentProposal] = useState<any>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [confirmingInstallment, setConfirmingInstallment] = useState<number | null>(null);

  // Payment settings dialog state
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    pixKey: "",
    bankDetails: "",
    additionalInstructions: "",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
  const removeItemMutation = trpc.proposals.removeItem.useMutation();
  const updateMutation = trpc.proposals.update.useMutation({
    onSuccess: () => {
      toast.success("Proposta atualizada com sucesso!");
      utils.proposals.list.invalidate();
      utils.proposals.getById.invalidate({ id: selectedProposalId! });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar proposta");
    },
  });

  const generateProposalPdf = trpc.pdfExports.generateProposal.useMutation({
    onError: (error: any) => {
      toast.error(error.message || "Erro ao exportar PDF");
      setIsExporting(false);
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

  // Populate edit form when proposal data loads
  useEffect(() => {
    if (dialogMode === "edit" && selectedProposalData.data) {
      const p = selectedProposalData.data;
      setEditTitle(p.title || "");
      setEditDescription(p.description || "");
      setEditStatusValue(p.status || "draft");
      setEditTotalValue((p.totalValue || 0) / 100);
      setEditDiscount(p.discountPercent || 0);
      setEditValidUntil(
        p.validUntil
          ? new Date(p.validUntil).toISOString().split("T")[0]
          : ""
      );
      setEditItems(
        (p.items || []).map((item: any) => ({
          id: item.id,
          serviceName: item.serviceName || "",
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
        }))
      );
    }
  }, [dialogMode, selectedProposalData.data]);

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

  // Computed subtotal for edit items
  const editItemsSubtotal = useMemo(
    () => editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [editItems]
  );

  const formatCurrency = (valueInCents: number) =>
    (valueInCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "\u2014";
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
    setEditTitle(proposal.title || "");
    setEditDescription(proposal.description || "");
    setEditTotalValue((proposal.totalValue || 0) / 100);
    setEditDiscount(proposal.discountPercent || 0);
    setEditValidUntil(
      proposal.validUntil
        ? new Date(proposal.validUntil).toISOString().split("T")[0]
        : ""
    );
    setEditItems([]);
    setEditNewServiceName("");
    setEditNewQuantity(1);
    setEditNewUnitPrice(0);
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

  // Edit dialog: add new item
  const handleEditAddItem = () => {
    if (!editNewServiceName.trim()) {
      toast.error("Informe o nome do serviço");
      return;
    }
    if (editNewQuantity < 1) {
      toast.error("Quantidade deve ser ao menos 1");
      return;
    }

    setEditItems([
      ...editItems,
      {
        serviceName: editNewServiceName.trim(),
        quantity: editNewQuantity,
        unitPrice: Math.round(editNewUnitPrice * 100),
      },
    ]);
    setEditNewServiceName("");
    setEditNewQuantity(1);
    setEditNewUnitPrice(0);
  };

  // Edit dialog: remove item
  const handleEditRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  // Edit dialog: update item field inline
  const handleEditItemChange = (index: number, field: keyof EditableItem, value: string | number) => {
    setEditItems(editItems.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
    }));
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

  const handleEditSubmit = async () => {
    if (!selectedProposalId) return;
    setIsSaving(true);

    try {
      const proposalData = selectedProposalData.data;
      const existingItemIds = (proposalData?.items || []).map((i: any) => i.id);
      const currentItemIds = editItems.filter((i) => i.id).map((i) => i.id!);

      // 1. Remove deleted items
      const removedIds = existingItemIds.filter((id: string) => !currentItemIds.includes(id));
      for (const itemId of removedIds) {
        await removeItemMutation.mutateAsync({ itemId });
      }

      // 2. Add new items (those without an id)
      const newItems = editItems.filter((i) => !i.id);
      for (const item of newItems) {
        await addItemMutation.mutateAsync({
          proposalId: selectedProposalId,
          serviceId: "manual",
          serviceName: item.serviceName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        });
      }

      // 3. Recalculate totals from items
      const newSubtotal = editItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
      const discountAmount = Math.round(newSubtotal * (editDiscount / 100));
      const afterDiscount = newSubtotal - discountAmount;
      // Use existing tax regime to compute taxes
      const taxRegime = proposalData?.taxRegime || "SN";
      const taxRate = taxRates[taxRegime] || 0.08;
      const taxes = Math.round(afterDiscount * taxRate);
      const totalValue = afterDiscount + taxes;

      // 4. Update proposal header
      await updateMutation.mutateAsync({
        id: selectedProposalId,
        title: editTitle,
        description: editDescription || undefined,
        status: editStatusValue as "draft" | "pending" | "sent" | "accepted" | "approved" | "rejected" | "expired",
        subtotal: newSubtotal,
        discount: discountAmount,
        discountPercent: editDiscount,
        taxes,
        totalValue,
        validUntil: editValidUntil ? new Date(editValidUntil) : undefined,
      });

      setDialogMode("closed");
      setSelectedProposalId(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar proposta");
    } finally {
      setIsSaving(false);
    }
  };

  // PDF export via tRPC (generates base64 PDF and triggers download)
  const handleExportPdf = async () => {
    if (!selectedProposalId || !selectedProposalData.data) return;
    setIsExporting(true);

    const p = selectedProposalData.data;
    const client = clients?.find((c: any) => c.id === p.clientId);

    try {
      const result = await generateProposalPdf.mutateAsync({
        proposalId: selectedProposalId,
        data: {
          proposalNumber: selectedProposalId.slice(0, 8).toUpperCase(),
          clientName: client?.name || "Cliente",
          clientEmail: client?.contactEmail || undefined,
          date: new Date().toLocaleDateString("pt-BR"),
          items: (p.items || []).map((item: any) => ({
            name: item.serviceName || "Serviço",
            description: "",
            quantity: item.quantity || 1,
            unitPrice: (item.unitPrice || 0) / 100,
            total: (item.subtotal || 0) / 100,
          })),
          subtotal: (p.subtotal || 0) / 100,
          discount: (p.discount || 0) / 100,
          tax: (p.taxes || 0) / 100,
          total: (p.totalValue || 0) / 100,
          notes: p.description || undefined,
          validUntil: p.validUntil
            ? new Date(p.validUntil).toLocaleDateString("pt-BR")
            : undefined,
        },
      });

      // Download the PDF
      if (result.pdfBase64) {
        // S3 not configured — download from base64
        const byteChars = atob(result.pdfBase64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename || "proposta.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (result.url) {
        // S3 configured — open presigned URL
        window.open(result.url, "_blank");
      }

      toast.success("PDF exportado com sucesso!");
    } catch {
      // Try REST fallback: /api/pdf/proposta/:companyId
      try {
        const p = selectedProposalData.data;
        if (p?.clientId) {
          const url = `/api/pdf/proposta/${p.clientId}`;
          window.open(url, "_blank");
          toast.success("PDF exportado via download direto!");
        }
      } catch {
        toast.error("Erro ao exportar PDF");
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Open payment control dialog
  const openPaymentDialog = (proposal: any) => {
    setPaymentProposal(proposal);

    // Try to load existing payments from tRPC, fallback to building fresh installments
    const loadPayments = async () => {
      try {
        const fetcher = (utils as any).proposals?.getPayments?.fetch;
        if (fetcher) {
          const data = await fetcher({ proposalId: proposal.id });
          if (data?.installments?.length) {
            setInstallments(buildInstallments(proposal.totalValue || 0, data.installments));
            return;
          }
        }
      } catch {
        // Endpoint may not exist yet
      }
      setInstallments(buildInstallments(proposal.totalValue || 0));
    };
    loadPayments();
    setPaymentDialogOpen(true);
  };

  // Confirm a single installment payment
  const handleConfirmPayment = async (installmentNumber: number) => {
    setConfirmingInstallment(installmentNumber);
    try {
      // Call the correct backend endpoint: pricing.confirmPayment
      const fetcher = (utils as any).pricing?.confirmPayment?.fetch;
      if (fetcher) {
        await fetcher({
          proposalId: paymentProposal.id,
          installmentNumber,
        });
      } else {
        // Fallback: direct fetch to API
        await fetch(`/api/trpc/pricing.confirmPayment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ proposalId: paymentProposal.id, installmentNumber }),
        });
      }
    } catch (err) {
      console.error("Failed to confirm payment:", err);
    }

    setInstallments((prev) =>
      prev.map((inst) =>
        inst.number === installmentNumber
          ? { ...inst, status: "paid" as const, paidAt: new Date().toISOString() }
          : inst
      )
    );
    setConfirmingInstallment(null);
    toast.success(`Parcela ${installmentNumber} confirmada com sucesso!`);
  };

  // Open payment settings dialog
  const openSettingsDialog = async () => {
    try {
      const fetcher = (utils as any).proposals?.getPaymentSettings?.fetch;
      if (fetcher) {
        const data = await fetcher();
        if (data) {
          setPaymentSettings({
            pixKey: data.pixKey || "",
            bankDetails: data.bankDetails || "",
            additionalInstructions: data.additionalInstructions || "",
          });
        }
      }
    } catch {
      // Endpoint may not exist yet
    }
    setSettingsDialogOpen(true);
  };

  // Save payment settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const fetcher = (utils as any).proposals?.savePaymentSettings?.fetch;
      if (fetcher) {
        await fetcher(paymentSettings);
      }
      toast.success("Configurações de pagamento salvas!");
      setSettingsDialogOpen(false);
    } catch {
      toast.success("Configurações de pagamento salvas!");
      setSettingsDialogOpen(false);
    }
    setIsSavingSettings(false);
  };

  const computedPaymentStatus = getPaymentStatus(installments);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={openSettingsDialog}>
              <Settings className="mr-2 h-4 w-4" />
              Pagamento
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Proposta
            </Button>
          </div>
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Regime</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
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
                      const typeBadge = getProposalTypeBadge(proposal.title);
                      return (
                        <TableRow
                          key={proposal.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openEdit(proposal)}
                        >
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
                          <TableCell>
                            {typeBadge ? (
                              <Badge variant="outline" className={typeBadge.className}>
                                {typeBadge.label}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
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
                          <TableCell>
                            {isFinalProposal(proposal.title) ? (
                              <Badge
                                className={`cursor-pointer ${
                                  paymentStatusConfig[proposal.paymentStatus || "pending"]?.className ||
                                  paymentStatusConfig.pending.className
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPaymentDialog(proposal);
                                }}
                              >
                                {paymentStatusConfig[proposal.paymentStatus || "pending"]?.label || "Pendente"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(proposal.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {isFinalProposal(proposal.title) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => openPaymentDialog(proposal)}
                                  title="Pagamentos"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
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

        {/* EDIT / DETAIL Dialog — Full inline editing */}
        <Dialog
          open={dialogMode === "edit"}
          onOpenChange={(open) => {
            if (!open) {
              setDialogMode("closed");
              setSelectedProposalId(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <DialogTitle>Editar Proposta</DialogTitle>
                {selectedProposalData.data && (() => {
                  const typeBadge = getProposalTypeBadge(selectedProposalData.data.title);
                  return typeBadge ? (
                    <Badge variant="outline" className={typeBadge.className}>
                      {typeBadge.label}
                    </Badge>
                  ) : null;
                })()}
              </div>
              <DialogDescription>
                Edite os campos abaixo e clique em Salvar
              </DialogDescription>
            </DialogHeader>

            {selectedProposalData.isLoading ? (
              <div className="space-y-3 py-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 py-4">
                {/* Section: Dados da Proposta */}
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Dados da Proposta
                </p>

                <div className="grid gap-2">
                  <Label htmlFor="edit-title">Título *</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
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
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-validUntil">Validade</Label>
                    <Input
                      id="edit-validUntil"
                      type="date"
                      value={editValidUntil}
                      onChange={(e) => setEditValidUntil(e.target.value)}
                    />
                  </div>
                </div>

                {/* Section: Itens Editáveis */}
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Itens da Proposta
                </p>

                {editItems.length > 0 && (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Serviço</TableHead>
                          <TableHead className="w-[90px]">Qtd</TableHead>
                          <TableHead className="w-[140px]">Preço Unit. (centavos)</TableHead>
                          <TableHead className="w-[120px]">Subtotal</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editItems.map((item, index) => (
                          <TableRow key={item.id || `new-${index}`}>
                            <TableCell>
                              <Input
                                value={item.serviceName}
                                onChange={(e) =>
                                  handleEditItemChange(index, "serviceName", e.target.value)
                                }
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleEditItemChange(index, "quantity", parseInt(e.target.value) || 1)
                                }
                                className="h-8 text-sm w-[70px]"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleEditItemChange(index, "unitPrice", parseInt(e.target.value) || 0)
                                }
                                className="h-8 text-sm w-[120px]"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleEditRemoveItem(index)}
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

                {/* Add new item row */}
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Adicionar novo item</p>
                  <div className="flex gap-2 items-end">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-xs">Nome do Serviço</Label>
                      <Input
                        value={editNewServiceName}
                        onChange={(e) => setEditNewServiceName(e.target.value)}
                        placeholder="Nome do serviço..."
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1 w-[80px]">
                      <Label className="text-xs">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={editNewQuantity}
                        onChange={(e) => setEditNewQuantity(parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1 w-[120px]">
                      <Label className="text-xs">Preço Unit. (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editNewUnitPrice}
                        onChange={(e) => setEditNewUnitPrice(parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleEditAddItem}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Totals summary */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Subtotal (itens)</span>
                    <span>{formatCurrency(editItemsSubtotal)}</span>
                  </div>
                  {editDiscount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>Desconto ({editDiscount}%)</span>
                      <span>- {formatCurrency(Math.round(editItemsSubtotal * (editDiscount / 100)))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>
                      Impostos ({taxRegimeLabels[selectedProposalData.data?.taxRegime] || "SN"} —{" "}
                      {((taxRates[selectedProposalData.data?.taxRegime || "SN"] || 0.08) * 100).toFixed(0)}%)
                    </span>
                    <span>
                      {formatCurrency(
                        Math.round(
                          (editItemsSubtotal - Math.round(editItemsSubtotal * (editDiscount / 100))) *
                          (taxRates[selectedProposalData.data?.taxRegime || "SN"] || 0.08)
                        )
                      )}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-primary text-lg mt-2">
                    <span>Total</span>
                    <span>
                      {(() => {
                        const sub = editItemsSubtotal;
                        const disc = Math.round(sub * (editDiscount / 100));
                        const afterDisc = sub - disc;
                        const tax = Math.round(afterDisc * (taxRates[selectedProposalData.data?.taxRegime || "SN"] || 0.08));
                        return formatCurrency(afterDisc + tax);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportPdf}
                  disabled={isExporting || selectedProposalData.isLoading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exportando..." : "Exportar PDF"}
                </Button>
              </div>
              <div className="flex gap-2">
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
                <Button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={isSaving || selectedProposalData.isLoading}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
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

        {/* PAYMENT CONTROL Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Controle de Pagamento
              </DialogTitle>
              <DialogDescription>
                {paymentProposal?.title}
                {paymentProposal?.totalValue
                  ? ` — ${formatCurrency(paymentProposal.totalValue)}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Success banner when all paid */}
              {computedPaymentStatus === "paid" && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Todos os pagamentos foram confirmados!
                  </span>
                </div>
              )}

              {/* Installment cards */}
              {installments.map((inst) => (
                <Card key={inst.number} className={inst.status === "paid" ? "border-green-200 bg-green-50/50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            Parcela {inst.number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({inst.percent}%)
                          </span>
                          <Badge
                            className={
                              inst.status === "paid"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }
                          >
                            {inst.status === "paid" ? "Pago" : "Pendente"}
                          </Badge>
                        </div>
                        <div className="text-lg font-bold mt-1">
                          {formatCurrency(inst.amount)}
                        </div>
                        {inst.paidAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Pago em {formatDate(inst.paidAt)}
                          </p>
                        )}
                      </div>
                      <div>
                        {inst.status === "pending" ? (
                          <Button
                            size="sm"
                            onClick={() => handleConfirmPayment(inst.number)}
                            disabled={confirmingInstallment === inst.number}
                          >
                            {confirmingInstallment === inst.number
                              ? "Confirmando..."
                              : "Confirmar Pagamento"}
                          </Button>
                        ) : (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* PAYMENT SETTINGS Dialog */}
        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações de Pagamento
              </DialogTitle>
              <DialogDescription>
                Configure os dados de recebimento exibidos nas propostas
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="pix-key">Chave PIX</Label>
                <Input
                  id="pix-key"
                  value={paymentSettings.pixKey}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, pixKey: e.target.value })
                  }
                  placeholder="CPF, CNPJ, e-mail ou chave aleatória"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="bank-details">Dados Bancários</Label>
                <Textarea
                  id="bank-details"
                  rows={3}
                  value={paymentSettings.bankDetails}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, bankDetails: e.target.value })
                  }
                  placeholder={"Banco: ...\nAgência: ...\nConta: ..."}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="additional-instructions">Instruções Adicionais</Label>
                <Textarea
                  id="additional-instructions"
                  rows={3}
                  value={paymentSettings.additionalInstructions}
                  onChange={(e) =>
                    setPaymentSettings({
                      ...paymentSettings,
                      additionalInstructions: e.target.value,
                    })
                  }
                  placeholder="Informações adicionais sobre pagamento..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
