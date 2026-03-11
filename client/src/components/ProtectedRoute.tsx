import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/_core/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

// Rotas que não exigem assinatura ativa
const SUBSCRIPTION_EXEMPT_PATHS = [
  "/subscription",
  "/subscription/pricing",
  "/subscription/checkout",
  "/subscription/success",
  "/subscription/failure",
];

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin bypass — admins não precisam de assinatura
  if (user.role === "admin") {
    return <>{children}</>;
  }

  // Verificar se a rota atual é isenta de assinatura
  const isExempt = SUBSCRIPTION_EXEMPT_PATHS.some((p) => location.pathname.startsWith(p));

  // Se não tem assinatura ativa e não está em rota isenta, redirecionar para pricing
  if (!isExempt) {
    const status = user.subscriptionStatus;
    const hasActiveSubscription = status === "active" || status === "trialing";

    if (!hasActiveSubscription) {
      return <Navigate to="/subscription/pricing" replace />;
    }
  }

  return <>{children}</>;
}
