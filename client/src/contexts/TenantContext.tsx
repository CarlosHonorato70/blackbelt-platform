import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Tenant {
  id: string;
  name: string;
  cnpj: string;
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  clearSelectedTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = "blackbelt_selected_tenant";

export function TenantProvider({ children }: { children: ReactNode }) {
  const [selectedTenant, setSelectedTenantState] = useState<Tenant | null>(
    () => {
      // Recuperar tenant selecionado do localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
      return null;
    }
  );

  const setSelectedTenant = (tenant: Tenant | null) => {
    setSelectedTenantState(tenant);
    if (tenant) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearSelectedTenant = () => {
    setSelectedTenant(null);
  };

  return (
    <TenantContext.Provider
      value={{
        selectedTenant,
        setSelectedTenant,
        clearSelectedTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
