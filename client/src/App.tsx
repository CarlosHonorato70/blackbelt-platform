import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./_core/hooks/useAuth";

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Carregando...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function AppContent() {
  const [count, setCount] = useState(0);
  const { user, error, clearError, logout } = useAuth();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">BB</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Black Belt Platform
                </h1>
                {user && (
                  <p className="text-xs text-gray-500">
                    Olá, {user.name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCount((c) => c + 1)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 transform hover:scale-105"
              >
                Contador: {count}
              </button>
              {user && (
                <button
                  onClick={logout}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-md transition-all duration-200 transform hover:scale-105"
                >
                  Sair
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="ml-3 text-red-500 hover:text-red-700 font-medium text-sm underline"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-8 sm:px-0">
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
              <h2 className="text-2xl font-bold text-white">Bem-vindo à Black Belt Platform</h2>
              <p className="text-indigo-100 mt-1">Sistema empresarial de gestão e consultoria</p>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md border border-blue-200">
                  <div className="text-blue-600 text-3xl mb-3">📊</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Análise Completa</h3>
                  <p className="text-gray-600 text-sm">Dashboard com métricas em tempo real e relatórios detalhados</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md border border-purple-200">
                  <div className="text-purple-600 text-3xl mb-3">🔒</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Segurança Total</h3>
                  <p className="text-gray-600 text-sm">Autenticação robusta e proteção de dados sensíveis</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md border border-green-200">
                  <div className="text-green-600 text-3xl mb-3">⚡</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Alta Performance</h3>
                  <p className="text-gray-600 text-sm">Otimizado para velocidade e escalabilidade</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/api/health"
                  className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Testar API
                </a>
                <button
                  onClick={() => setCount((c) => c + 1)}
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-gray-300 text-base font-medium rounded-lg shadow-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Incrementar ({count})
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Routes>
        <Route path="/" element={<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-900">Página Inicial</h2></div>} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <div className="bg-white rounded-lg shadow-xl p-8 mx-4">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Dashboard Protegido</h2>
                <p className="text-gray-600">Área exclusiva para usuários autenticados</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

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
