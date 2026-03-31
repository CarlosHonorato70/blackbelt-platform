/**
 * CompanySelector: Permite ao consultor selecionar qual empresa
 * está gerenciando atualmente. Usa o ImpersonationContext para
 * trocar o contexto do tenant.
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTenant } from "@/contexts/TenantContext";
import { Building2, ChevronDown, ChevronUp, X, Undo2 } from "lucide-react";

export function CompanySelector() {
  const { isImpersonating, impersonating, startImpersonation, stopImpersonation } = useImpersonation();
  const { setSelectedTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = trpc.companies.list.useQuery({}, {
    retry: false,
  });

  const companies = data?.companies ?? [];

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Se não tem empresas e não está impersonando, não exibir
  if (companies.length === 0 && !isImpersonating) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      {/* Badge da empresa selecionada */}
      {isImpersonating && (
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded px-2 py-0.5 truncate flex-1 min-w-0">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{impersonating?.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTenant(null);
                stopImpersonation();
              }}
              className="ml-auto shrink-0 hover:text-amber-200 transition-colors"
              title="Voltar para minha consultoria"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Botão toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-md border border-sidebar-border bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
      >
        <Building2 className="h-3.5 w-3.5 text-[#c8a55a]" />
        <span>{isImpersonating ? "Trocar Empresa" : "Selecionar Empresa"}</span>
        {open ? (
          <ChevronUp className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-auto" />
        )}
      </button>

      {/* Lista de empresas (inline, sem portal) */}
      {open && (
        <div className="mt-1 rounded-md border border-sidebar-border bg-sidebar overflow-hidden shadow-lg">
          {isImpersonating && (
            <button
              onClick={() => {
                setSelectedTenant(null);
                stopImpersonation();
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#c8a55a] hover:bg-sidebar-accent transition-colors border-b border-sidebar-border"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Voltar para Minha Consultoria
            </button>
          )}
          {companies.length > 0 ? (
            companies.map((company: any) => (
              <button
                key={company.id}
                onClick={() => {
                  setOpen(false);
                  setSelectedTenant({ id: company.id, name: company.name, cnpj: company.cnpj || "" });
                  startImpersonation(company.id, company.name);
                }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-sidebar-accent transition-colors text-left ${
                  impersonating?.id === company.id ? "bg-sidebar-accent text-[#c8a55a]" : "text-sidebar-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{company.name}</span>
                  <span className="text-sidebar-foreground/50 text-[10px]">{company.cnpj}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
              Nenhuma empresa cadastrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
