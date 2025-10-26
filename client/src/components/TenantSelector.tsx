import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function TenantSelector() {
  const { selectedTenant, setSelectedTenant } = useTenant();

  const { data: tenants, isLoading } = trpc.tenants.list.useQuery({});

  const handleValueChange = (tenantId: string) => {
    const tenant = tenants?.find((t) => t.id === tenantId);
    if (tenant) {
      setSelectedTenant({
        id: tenant.id,
        name: tenant.name,
        cnpj: tenant.cnpj,
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select
        value={selectedTenant?.id || ""}
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione uma empresa"} />
        </SelectTrigger>
        <SelectContent>
          {tenants?.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

