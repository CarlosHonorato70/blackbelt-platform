import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Proposals() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    clientId: "",
    title: "",
    taxRegime: "MEI" as "MEI" | "SN" | "LP" | "autonomous",
    description: "",
  });
  const [proposalItems, setProposalItems] = useState<
    Array<{ serviceId: string; quantity: number; unitPrice: number }>
  >([]);
  const [selectedService, setSelectedService] = useState("");
  const [quantity, setQuantity] = useState(1);

  const {
    data: proposals,
    isLoading,
    refetch,
  } = trpc.proposals.list.useQuery({ clientId: "" });
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: services } = trpc.services.list.useQuery();
  const { data: parameters } = trpc.pricingParameters.get.useQuery();
  const createMutation = trpc.proposals.create.useMutation();
  const deleteMutation = trpc.proposals.delete.useMutation();

  const handleAddItem = () => {
    if (!selectedService) {
      toast.error("Selecione um serviço");
      return;
    }

    const service = services?.find((s: any) => s.id === selectedService);
    if (!service) return;

    setProposalItems([
      ...proposalItems,
      {
        serviceId: selectedService,
        quantity,
        unitPrice: service.minPrice,
      },
    ]);

    setSelectedService("");
    setQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setProposalItems(proposalItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return proposalItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
  };

  const handleCreateProposal = async () => {
    if (!formData.clientId || !formData.title || proposalItems.length === 0) {
      toast.error("Preencha todos os campos e adicione itens");
      return;
    }

    try {
      const subtotal = calculateTotal();
      await createMutation.mutateAsync({
        clientId: formData.clientId,
        title: formData.title,
        subtotal,
        totalValue: subtotal,
        taxRegime: formData.taxRegime,
        description: formData.description,
      });

      toast.success("Proposta criada com sucesso!");
      setFormData({
        clientId: "",
        title: "",
        taxRegime: "MEI",
        description: "",
      });
      setProposalItems([]);
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error("Erro ao criar proposta");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar esta proposta?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Proposta deletada com sucesso!");
        refetch();
      } catch (error) {
        toast.error("Erro ao deletar proposta");
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Propostas</h1>
            <p className="text-gray-600">
              Criar e gerenciar propostas comerciais
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Proposta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Nova Proposta</DialogTitle>
                <DialogDescription>
                  Crie uma proposta comercial para seu cliente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Cliente</label>
                  <select
                    value={formData.clientId}
                    onChange={e =>
                      setFormData({ ...formData, clientId: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Selecione um cliente</option>
                    {clients?.map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  placeholder="Título da Proposta"
                  value={formData.title}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />

                <div>
                  <label className="text-sm font-medium">
                    Regime Tributário
                  </label>
                  <select
                    value={formData.taxRegime}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        taxRegime: e.target.value as
                          | "MEI"
                          | "SN"
                          | "LP"
                          | "autonomous",
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="MEI">MEI</option>
                    <option value="SN">Simples Nacional</option>
                    <option value="LP">Lucro Presumido</option>
                    <option value="autonomous">Autônomo</option>
                  </select>
                </div>

                <Input
                  placeholder="Descrição (opcional)"
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Itens da Proposta</h3>

                  <div className="space-y-2 mb-4">
                    <div>
                      <label className="text-sm font-medium">Serviço</label>
                      <select
                        value={selectedService}
                        onChange={e => setSelectedService(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Selecione um serviço</option>
                        {services?.map((service: any) => (
                          <option key={service.id} value={service.id}>
                            {service.name} (R$ {service.minPrice.toFixed(2)} -
                            R$ {service.maxPrice.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Quantidade"
                        value={quantity}
                        onChange={e =>
                          setQuantity(parseInt(e.target.value) || 1)
                        }
                        className="flex-1"
                      />
                      <Button onClick={handleAddItem}>Adicionar</Button>
                    </div>
                  </div>

                  {proposalItems.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {proposalItems.map((item, index) => {
                        const service = services?.find(
                          (s: any) => s.id === item.serviceId
                        );
                        return (
                          <div
                            key={index}
                            className="flex justify-between items-center bg-gray-50 p-2 rounded"
                          >
                            <span className="text-sm">
                              {service?.name} x {item.quantity} = R${" "}
                              {(item.quantity * item.unitPrice).toFixed(2)}
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-sm text-gray-600">Total da Proposta</p>
                    <p className="text-2xl font-bold text-blue-600">
                      R$ {calculateTotal().toFixed(2)}
                    </p>
                  </div>
                </div>

                <Button onClick={handleCreateProposal} className="w-full">
                  Criar Proposta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Propostas</CardTitle>
            <CardDescription>
              Total de {proposals?.length || 0} propostas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500">Carregando...</p>
            ) : proposals && proposals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4">Título</th>
                      <th className="text-left py-2 px-4">Cliente</th>
                      <th className="text-left py-2 px-4">Valor</th>
                      <th className="text-left py-2 px-4">Regime</th>
                      <th className="text-left py-2 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proposals.map((proposal: any) => {
                      const client = clients?.find(
                        (c: any) => c.id === proposal.clientId
                      );
                      return (
                        <tr
                          key={proposal.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-2 px-4 font-medium">
                            {proposal.title}
                          </td>
                          <td className="py-2 px-4">{client?.name || "-"}</td>
                          <td className="py-2 px-4">
                            R$ {proposal.totalValue.toFixed(2)}
                          </td>
                          <td className="py-2 px-4">{proposal.taxRegime}</td>
                          <td className="py-2 px-4 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => handleDelete(proposal.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500">
                Nenhuma proposta cadastrada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
