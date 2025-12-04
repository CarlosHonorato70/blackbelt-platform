import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Services() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    unit: "hour" as "hour" | "day" | "project" | "month",
    minPrice: 0,
    maxPrice: 0,
    description: "",
  });

  const { data: services, isLoading, refetch } = trpc.services.list.useQuery();
  const createMutation = trpc.services.create.useMutation();
  const updateMutation = trpc.services.update.useMutation();
  const deleteMutation = trpc.services.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name || !formData.category) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (formData.minPrice > formData.maxPrice) {
      toast.error("Preço mínimo não pode ser maior que máximo");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Serviço atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Serviço criado com sucesso!");
      }

      setFormData({
        name: "",
        category: "",
        unit: "hour",
        minPrice: 0,
        maxPrice: 0,
        description: "",
      });
      setEditingId(null);
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error(editingId ? "Erro ao atualizar serviço" : "Erro ao criar serviço");
    }
  };

  const handleEdit = (service: any) => {
    setFormData({
      name: service.name,
      category: service.category,
      unit: service.unit,
      minPrice: service.minPrice,
      maxPrice: service.maxPrice,
      description: service.description || "",
    });
    setEditingId(service.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este serviço?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Serviço deletado com sucesso!");
        refetch();
      } catch (error) {
        toast.error("Erro ao deletar serviço");
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      category: "",
      unit: "hour",
      minPrice: 0,
      maxPrice: 0,
      description: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Serviços</h1>
            <p className="text-gray-600">Gerenciar serviços e preços</p>
          </div>
          <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Serviço" : "Criar Novo Serviço"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do serviço" : "Adicione um novo serviço à sua base"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome do Serviço"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  placeholder="Categoria"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
                <div>
                  <label className="text-sm font-medium">Unidade</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as "hour" | "day" | "project" | "month" })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="hour">Hora</option>
                    <option value="day">Dia</option>
                    <option value="project">Projeto</option>
                    <option value="month">Mês</option>
                  </select>
                </div>
                <Input
                  placeholder="Preço Mínimo"
                  type="number"
                  value={formData.minPrice}
                  onChange={(e) => setFormData({ ...formData, minPrice: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  placeholder="Preço Máximo"
                  type="number"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData({ ...formData, maxPrice: parseFloat(e.target.value) || 0 })}
                />
                <Input
                  placeholder="Descrição (opcional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Button onClick={handleCreate} className="w-full">
                  {editingId ? "Atualizar Serviço" : "Criar Serviço"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Serviços</CardTitle>
            <CardDescription>Total de {services?.length || 0} serviços</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500">Carregando...</p>
            ) : services && services.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4">Serviço</th>
                      <th className="text-left py-2 px-4">Categoria</th>
                      <th className="text-left py-2 px-4">Unidade</th>
                      <th className="text-left py-2 px-4">Preço Mín.</th>
                      <th className="text-left py-2 px-4">Preço Máx.</th>
                      <th className="text-left py-2 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service: any) => (
                      <tr key={service.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{service.name}</td>
                        <td className="py-2 px-4">{service.category}</td>
                        <td className="py-2 px-4">
                          {service.unit === "hour" && "Hora"}
                          {service.unit === "day" && "Dia"}
                          {service.unit === "project" && "Projeto"}
                          {service.unit === "month" && "Mês"}
                        </td>
                        <td className="py-2 px-4">R$ {service.minPrice.toFixed(2)}</td>
                        <td className="py-2 px-4">R$ {service.maxPrice.toFixed(2)}</td>
                        <td className="py-2 px-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleEdit(service)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleDelete(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500">Nenhum serviço cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
