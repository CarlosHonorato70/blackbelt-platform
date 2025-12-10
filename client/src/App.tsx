import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "../_core/hooks/useAuth";

// Loading
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

// App Content
function AppContent() {
  const [count, setCount] = useState(0);
  const { user, error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Black Belt Platform
                {user && <span className="ml-2 text-sm text-gray-500">| Olá, {user.name}</span>}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCount((count) => count + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Contador: {count}
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mx-4 mt-2">
          <p className="text-sm">{error}</p>
          <button onClick={clearError} className="mt-1 text-red-700 underline">
            Fechar
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Bem-vindo à Black Belt Platform
              </h3>
              <p className="text-gray-500 mb-4">
                Sistema de gestão de consultoria em conformidade e segurança
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/api/health"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Testar API
                </a>
                <button
                  onClick={() => setCount((count) => count + 1)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Incrementar Contador ({count})
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Routes>
        <Route path="/" element={<div>Página Inicial</div>} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div>Dashboard Protegido</div>
            </ProtectedRoute>
          } 
        />
        <Route path="/api/*" element={<div>Rotas de API</div>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// App principal
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
