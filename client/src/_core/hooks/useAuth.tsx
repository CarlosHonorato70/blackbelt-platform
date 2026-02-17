import { createContext, useContext, ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useNavigate } from "react-router-dom";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  // Busca o usuario via tRPC (usa cookie automaticamente)
  const { data: user, isLoading, refetch, error } = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Log de erros de autenticacao (sem expor ao usuario)
  if (error) {
    console.warn("[Auth] Falha ao verificar sessao:", error.message);
  }

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      refetch();
      navigate("/login", { replace: true });
    },
    onError: (err: { message: string }) => {
      console.error("[Auth] Erro ao fazer logout:", err.message);
      // Mesmo se o logout falhar no servidor, limpar estado local
      refetch();
      navigate("/login", { replace: true });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const authValue: AuthContextValue = {
    user: user || null,
    loading: isLoading,
    logout,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}

export function useIsAuthenticated() {
  const { user, loading } = useAuth();
  return { isAuthenticated: !!user && !loading, user, loading };
}
