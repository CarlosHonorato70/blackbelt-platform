import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global — captura erros nao tratados no React
 * e exibe uma tela de fallback em vez de uma tela branca.
 * Em producao, nao expoe stack traces.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Erro capturado:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);

    // TODO: Em producao, enviar para servico de monitoramento (Sentry, etc.)
    // if (import.meta.env.PROD) {
    //   reportErrorToService(error, errorInfo);
    // }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-lg p-8 bg-card rounded-xl shadow-lg">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>

            <p className="text-sm text-muted-foreground mb-6 text-center">
              Ocorreu um erro inesperado. Tente recarregar a pagina ou voltar para o inicio.
            </p>

            {/* Mostra detalhes do erro APENAS em desenvolvimento */}
            {import.meta.env.DEV && this.state.error && (
              <div className="p-4 w-full rounded bg-muted overflow-auto mb-6 max-h-40">
                <pre className="text-xs text-destructive whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-primary text-primary-foreground",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <RotateCcw size={16} />
                Recarregar
              </button>

              <button
                onClick={() => { window.location.href = "/login"; }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg",
                  "bg-secondary text-secondary-foreground border",
                  "hover:opacity-90 cursor-pointer"
                )}
              >
                <Home size={16} />
                Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
