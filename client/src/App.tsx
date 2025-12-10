import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  const [count, setCount] = useState(0);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Black Belt Platform
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setCount((count) => count + 1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Count: {count}
                </button>
              </div>
            </div>
          </div>
        </header>

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
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Testar API
                  </a>
                  <button
                    onClick={() => setCount((count) => count + 1)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Incrementar Contador ({count})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/api/*" element={<div>API Routes</div>} />
      </Routes>
    </Router>
  );
}

export default App;