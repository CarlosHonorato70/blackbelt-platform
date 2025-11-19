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
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function People() {
  const { selectedTenant } = useTenant();
  const [dialogOpen, setDialogOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: people, isLoading } = trpc.people.list.useQuery(
    { tenantId: selectedTenant?.id! },
    { enabled: !!selectedTenant }
  );

  const { data: sectors } = trpc.sectors.list.useQuery(
    { tenantId: selectedTenant?.id! },
    { enabled: !!selectedTenant }
  );

  const createMutation = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Colaborador criado com sucesso!");
      utils.people.list.invalidate();
      setTimeout(() => {
        setDialogOpen(false);
      }, 100);
    },
    onError: error => {
      toast.error(error.message || "Erro ao criar colaborador");
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
      tenantId: selectedTenant.id,
      sectorId: formData.get("sectorId") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      position: formData.get("position") as string,
    });
  };

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
      </div>
    </DashboardLayout>
  );
}
