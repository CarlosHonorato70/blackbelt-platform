import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ImpersonationTarget {
  id: string;
  name: string;
}

interface ImpersonationContextType {
  impersonating: ImpersonationTarget | null;
  startImpersonation: (id: string, name: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = "blackbelt_impersonating_tenant";

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonating, setImpersonating] = useState<ImpersonationTarget | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const startImpersonation = useCallback((id: string, name: string) => {
    const target = { id, name };
    setImpersonating(target);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    window.location.reload();
  }, []);

  const stopImpersonation = useCallback(() => {
    setImpersonating(null);
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }, []);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonating,
        startImpersonation,
        stopImpersonation,
        isImpersonating: !!impersonating,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}
