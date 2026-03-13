/**
 * CompanySelector: Permite ao consultor selecionar qual empresa
 * está gerenciando atualmente. Usa o ImpersonationContext para
 * trocar o contexto do tenant.
 */

import { trpc } from "@/lib/trpc";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTenant } from "@/contexts/TenantContext";
import { Building2, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CompanySelector() {
  const { isImpersonating, impersonating, startImpersonation, stopImpersonation } = useImpersonation();
  const { setSelectedTenant } = useTenant();
  const { data } = trpc.companies.list.useQuery({}, {
    retry: false,
  });

  const companies = data?.companies ?? [];

  // Se não tem empresas e não está impersonando, não exibir
  if (companies.length === 0 && !isImpersonating) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {isImpersonating && (
        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 gap-1">
          <Building2 className="h-3 w-3" />
          {impersonating?.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTenant(null);
              stopImpersonation();
            }}
            className="ml-1 hover:text-amber-900"
            title="Voltar para minha consultoria"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
            <Building2 className="h-3.5 w-3.5" />
            {isImpersonating ? "Trocar" : "Empresa"}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {isImpersonating && (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTenant(null);
                  stopImpersonation();
                }}
                className="text-xs font-medium text-primary cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5 mr-2" />
                Voltar para Minha Consultoria
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {companies.length > 0 ? (
            companies.map((company: any) => (
              <DropdownMenuItem
                key={company.id}
                onClick={() => {
                  setSelectedTenant({ id: company.id, name: company.name, cnpj: company.cnpj || "" });
                  startImpersonation(company.id, company.name);
                }}
                className="text-xs cursor-pointer"
              >
                <Building2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium">{company.name}</span>
                  <span className="text-muted-foreground">{company.cnpj}</span>
                </div>
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              Nenhuma empresa cadastrada
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
