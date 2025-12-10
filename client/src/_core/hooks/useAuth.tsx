import { useState, useEffect, useContext, createContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
    error: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      validateToken(token);
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setState({ user: data.user || null, token, loading: false, error: null });
      } else {
        handleAuthError("Token inválido");
      }
    } catch (error) {
      handleAuthError("Erro de conexão");
    }
  };

  const handleAuthError = (message: string) => {
    localStorage.removeItem("authToken");
    setState((prev) => ({ ...prev, user: null, token: null, loading: false, error: message }));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem("authToken", data.token);
        setState({ user: data.user, token: data.token, loading: false, error: null });
        navigate("/dashboard", { replace: true });
        return true;
      } else {
        setState((prev) => ({ ...prev, error: data.message || "Credenciais inválidas", loading: false }));
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro de rede";
      setState((prev) => ({ ...prev, error: message, loading: false }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setState({ user: null, token: null, loading: false, error: null });
    navigate("/", { replace: true });
  };

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  const authValue: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
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
