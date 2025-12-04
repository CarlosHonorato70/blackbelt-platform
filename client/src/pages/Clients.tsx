import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Clients() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    industry: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });

  const { data: clients, isLoading, refetch } = trpc.clients.list.useQuery();
  const createMutation = trpc.clients.create.useMutation();
  const updateMutation = trpc.clients.update.useMutation();
  const deleteMutation = trpc.clients.delete.useMutation();

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Cliente atualizado com sucesso!");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Cliente criado com sucesso!");
      }

      setFormData({
        name: "",
        cnpj: "",
        industry: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
      });
      setEditingId(null);
      setIsOpen(false);
      refetch();
    } catch (error) {
      toast.error(editingId ? "Erro ao atualizar cliente" : "Erro ao criar cliente");
    }
  };

  const handleEdit = (client: any) => {
    setFormData({
      name: client.name,
      cnpj: client.cnpj || "",
      industry: client.industry || "",
      contactName: client.contactName || "",
      contactEmail: client.contactEmail || "",
      contactPhone: client.contactPhone || "",
    });
    setEditingId(client.id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este cliente?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Cliente deletado com sucesso!");
        refetch();
      } catch (error) {
        toast.error("Erro ao deletar cliente");
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setFormData({
      name: "",
      cnpj: "",
      industry: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-gray-600">Gerenciar clientes para propostas</p>
          </div>
          <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Cliente" : "Criar Novo Cliente"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Atualize os dados do cliente" : "Adicione um novo cliente à sua base"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Nome da Empresa"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  placeholder="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
                <Input
                  placeholder="Indústria"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
                <Input
                  placeholder="Nome do Contato"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
                <Input
                  placeholder="Email do Contato"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
                <Input
                  placeholder="Telefone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
                <Button onClick={handleCreate} className="w-full">
                  {editingId ? "Atualizar Cliente" : "Criar Cliente"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>Total de {clients?.length || 0} clientes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-gray-500">Carregando...</p>
            ) : clients && clients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-4">Empresa</th>
                      <th className="text-left py-2 px-4">CNPJ</th>
                      <th className="text-left py-2 px-4">Contato</th>
                      <th className="text-left py-2 px-4">Email</th>
                      <th className="text-left py-2 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client: any) => (
                      <tr key={client.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4 font-medium">{client.name}</td>
                        <td className="py-2 px-4">{client.cnpj || "-"}</td>
                        <td className="py-2 px-4">{client.contactName || "-"}</td>
                        <td className="py-2 px-4">{client.contactEmail || "-"}</td>
                        <td className="py-2 px-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleDelete(client.id)}
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
              <p className="text-center text-gray-500">Nenhum cliente cadastrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
