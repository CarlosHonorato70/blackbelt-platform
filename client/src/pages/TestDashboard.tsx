import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Filter,
  Play,
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface TestResult {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'running';
  duration: number;
  category: string;
  timestamp: string;
  error?: string;
}

interface TestSuite {
  name: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
  results: TestResult[];
}

interface DashboardStats {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  successRate: number;
  averageDuration: number;
  totalDuration: number;
  lastRun: string;
}

export default function TestDashboard() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    successRate: 0,
    averageDuration: 0,
    totalDuration: 0,
    lastRun: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const mockTestData: TestSuite[] = [
      {
        name: 'Autenticação',
        total: 3,
        passed: 3,
        failed: 0,
        skipped: 0,
        duration: 12500,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'auth-001',
            name: 'TC-001: Login com sucesso',
            status: 'passed',
            duration: 4200,
            category: 'Autenticação',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'auth-002',
            name: 'TC-002: Login com falha',
            status: 'passed',
            duration: 3800,
            category: 'Autenticação',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'auth-003',
            name: 'TC-003: Logout',
            status: 'passed',
            duration: 4500,
            category: 'Autenticação',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        name: 'Multi-Tenant',
        total: 2,
        passed: 2,
        failed: 0,
        skipped: 0,
        duration: 8900,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'tenant-001',
            name: 'TC-004: Selecionar empresa',
            status: 'passed',
            duration: 4200,
            category: 'Multi-Tenant',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'tenant-002',
            name: 'TC-005: Isolamento de dados',
            status: 'passed',
            duration: 4700,
            category: 'Multi-Tenant',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        name: 'Avaliação NR-01',
        total: 6,
        passed: 5,
        failed: 1,
        skipped: 0,
        duration: 28400,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'risk-001',
            name: 'TC-006: Criar avaliação',
            status: 'passed',
            duration: 5200,
            category: 'Avaliação NR-01',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'risk-003',
            name: 'TC-008: Adicionar fatores',
            status: 'failed',
            duration: 6200,
            category: 'Avaliação NR-01',
            timestamp: new Date().toISOString(),
            error: 'Timeout ao adicionar fator de risco',
          },
          {
            id: 'risk-004',
            name: 'TC-009: Calcular risco',
            status: 'passed',
            duration: 4100,
            category: 'Avaliação NR-01',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'risk-005',
            name: 'TC-010: Editar avaliação',
            status: 'passed',
            duration: 5000,
            category: 'Avaliação NR-01',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'risk-006',
            name: 'TC-011: Finalizar avaliação',
            status: 'passed',
            duration: 4100,
            category: 'Avaliação NR-01',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        name: 'Relatórios',
        total: 3,
        passed: 3,
        failed: 0,
        skipped: 0,
        duration: 15600,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'report-001',
            name: 'TC-012: Gerar relatório',
            status: 'passed',
            duration: 5200,
            category: 'Relatórios',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'report-002',
            name: 'TC-013: Validar conformidade',
            status: 'passed',
            duration: 5100,
            category: 'Relatórios',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'report-003',
            name: 'TC-014: Visualizar relatório',
            status: 'passed',
            duration: 5300,
            category: 'Relatórios',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        name: 'Exportação',
        total: 4,
        passed: 4,
        failed: 0,
        skipped: 0,
        duration: 18200,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'export-001',
            name: 'TC-015: Exportar Texto',
            status: 'passed',
            duration: 4200,
            category: 'Exportação',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'export-002',
            name: 'TC-016: Exportar JSON',
            status: 'passed',
            duration: 4500,
            category: 'Exportação',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'export-003',
            name: 'TC-017: Exportar Excel',
            status: 'passed',
            duration: 4800,
            category: 'Exportação',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'export-004',
            name: 'TC-018: Exportar múltiplos',
            status: 'passed',
            duration: 4700,
            category: 'Exportação',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      {
        name: 'Auditoria',
        total: 3,
        passed: 3,
        failed: 0,
        skipped: 0,
        duration: 14200,
        timestamp: new Date().toISOString(),
        results: [
          {
            id: 'audit-001',
            name: 'TC-019: Registrar log',
            status: 'passed',
            duration: 4200,
            category: 'Auditoria',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'audit-002',
            name: 'TC-020: Visualizar logs',
            status: 'passed',
            duration: 5000,
            category: 'Auditoria',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'audit-003',
            name: 'TC-021: Exportar logs',
            status: 'passed',
            duration: 5000,
            category: 'Auditoria',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    ];

    setTestSuites(mockTestData);

    const allResults = mockTestData.flatMap((suite) => suite.results);
    const passed = allResults.filter((r) => r.status === 'passed').length;
    const failed = allResults.filter((r) => r.status === 'failed').length;
    const skipped = allResults.filter((r) => r.status === 'skipped').length;
    const total = allResults.length;
    const totalDuration = mockTestData.reduce((sum, suite) => sum + suite.duration, 0);
    const averageDuration = totalDuration / total;

    setStats({
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
      skippedTests: skipped,
      successRate: (passed / total) * 100,
      averageDuration,
      totalDuration,
      lastRun: new Date().toISOString(),
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      console.log('Refreshing test results...');
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Passou
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'skipped':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Ignorado
          </Badge>
        );
      default:
        return null;
    }
  };

  const categoryData = testSuites.map((suite) => ({
    name: suite.name,
    passed: suite.passed,
    failed: suite.failed,
    skipped: suite.skipped,
  }));

  const successRateData = testSuites.map((suite) => ({
    name: suite.name,
    rate: ((suite.passed / suite.total) * 100).toFixed(1),
  }));

  const durationData = testSuites.map((suite) => ({
    name: suite.name,
    duration: (suite.duration / 1000).toFixed(2),
  }));

  const allResults = testSuites.flatMap((suite) => suite.results);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Carregando dados de testes...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard de Testes E2E</h1>
            <p className="text-gray-600 mt-1">
              Acompanhamento em tempo real dos testes automatizados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-blue-50' : ''}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button variant="outline" size="sm">
              <Play className="w-4 h-4 mr-2" />
              Executar Testes
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar Relatório
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.totalTests}</div>
              <p className="text-xs text-gray-500 mt-1">Testes cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Testes Passando</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.passedTests}</div>
              <Progress value={stats.successRate} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">{stats.successRate.toFixed(1)}% de sucesso</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Testes Falhando</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.failedTests}</div>
              <p className="text-xs text-gray-500 mt-1">Requer atenção</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Duração Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {(stats.averageDuration / 1000).toFixed(2)}s
              </div>
              <p className="text-xs text-gray-500 mt-1">Por teste</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Duração Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">
                {(stats.totalDuration / 1000).toFixed(1)}s
              </div>
              <p className="text-xs text-gray-500 mt-1">Tempo total</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tests by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Testes por Categoria</CardTitle>
              <CardDescription>Distribuição de testes por suite</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="passed" fill="#10b981" name="Passou" />
                  <Bar dataKey="failed" fill="#ef4444" name="Falhou" />
                  <Bar dataKey="skipped" fill="#6b7280" name="Ignorado" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Success Rate by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Sucesso</CardTitle>
              <CardDescription>Percentual de sucesso por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Duration by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Duração por Categoria</CardTitle>
              <CardDescription>Tempo de execução em segundos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}s`} />
                  <Bar dataKey="duration" fill="#8b5cf6" name="Duração (s)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Test Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Status</CardTitle>
              <CardDescription>Proporção de testes por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Passou', value: stats.passedTests, color: '#10b981' },
                      { name: 'Falhou', value: stats.failedTests, color: '#ef4444' },
                      { name: 'Ignorado', value: stats.skippedTests, color: '#6b7280' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'Passou', value: stats.passedTests, color: '#10b981' },
                      { name: 'Falhou', value: stats.failedTests, color: '#ef4444' },
                      { name: 'Ignorado', value: stats.skippedTests, color: '#6b7280' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Resultados dos Testes</CardTitle>
                <CardDescription>Detalhes de cada teste executado</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">
                  Todos ({allResults.length})
                </TabsTrigger>
                <TabsTrigger value="passed">
                  Passou ({allResults.filter((r) => r.status === 'passed').length})
                </TabsTrigger>
                <TabsTrigger value="failed">
                  Falhou ({allResults.filter((r) => r.status === 'failed').length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-2 mt-4">
                {allResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(result.status)}
                        <span className="font-medium text-sm">{result.name}</span>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-600 mt-1 ml-20">{result.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-500">{(result.duration / 1000).toFixed(2)}s</span>
                      <span className="text-xs text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="passed" className="space-y-2 mt-4">
                {allResults
                  .filter((r) => r.status === 'passed')
                  .map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                          <span className="font-medium text-sm">{result.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">{(result.duration / 1000).toFixed(2)}s</span>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="failed" className="space-y-2 mt-4">
                {allResults
                  .filter((r) => r.status === 'failed')
                  .map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-red-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(result.status)}
                          <span className="font-medium text-sm">{result.name}</span>
                        </div>
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1 ml-20">{result.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">{(result.duration / 1000).toFixed(2)}s</span>
                      </div>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Test Suites Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo por Suite de Testes</CardTitle>
            <CardDescription>Estatísticas detalhadas de cada suite</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testSuites.map((suite) => (
                <div key={suite.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{suite.name}</h3>
                    <div className="flex gap-2">
                      <Badge className="bg-green-100 text-green-800">{suite.passed} Passou</Badge>
                      {suite.failed > 0 && (
                        <Badge className="bg-red-100 text-red-800">{suite.failed} Falhou</Badge>
                      )}
                      {suite.skipped > 0 && (
                        <Badge className="bg-gray-100 text-gray-800">{suite.skipped} Ignorado</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={(suite.passed / suite.total) * 100} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {((suite.passed / suite.total) * 100).toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">{(suite.duration / 1000).toFixed(2)}s</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

