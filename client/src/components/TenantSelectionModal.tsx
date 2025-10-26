import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { Building2, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export function TenantSelectionModal() {
  const { selectedTenant, setSelectedTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery({});

  const handleSelectTenant = (tenantId: string) => {
    const tenant = tenants?.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenant({
        id: tenant.id,
        name: tenant.name,
        cnpj: tenant.cnpj,
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-left"
          disabled={isLoading}
        >
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-muted-foreground">Empresa selecionada</span>
            <span className="font-semibold truncate">
              {selectedTenant?.name || "Selecione uma empresa"}
            </span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Empresa</DialogTitle>
          <DialogDescription>
            Escolha a empresa com a qual deseja trabalhar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando empresas...
            </div>
          ) : tenants && tenants.length > 0 ? (
            tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${ 
                  selectedTenant?.id === tenant.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-border hover:border-blue-300 hover:bg-accent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{tenant.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      CNPJ: {tenant.cnpj}
                    </p>
                  </div>
                  {selectedTenant?.id === tenant.id && (
                    <Check className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma empresa encontrada
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="default"
            className="w-full"
            onClick={() => setOpen(false)}
            disabled={!selectedTenant}
          >
            Confirmar Seleção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

