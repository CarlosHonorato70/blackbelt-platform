import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Download,
  Edit,
  Eye,
  Filter,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  exportToJSON,
  exportToExcel,
  exportToCSV,
  generateAuditReport,
  exportToPDF,
} from "@/lib/exportUtils";

export default function AuditLogs() {
  const { selectedTenant } = useTenant();
  const [filters, setFilters] = useState({
    action: "todos",
    user: "",
    dateFrom: "",
    dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para visualizar logs de auditoria
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const { data: rawLogs = [] } = trpc.auditLogs.list.useQuery(
    { tenantId: tenantId ?? "", limit: 50 },
    { enabled: !!tenantId }
  );

  // Map DB records to display format
  const actionMap: Record<string, string> = { create: "criar", update: "editar", delete: "deletar", read: "visualizar" };
  const auditLogs = rawLogs.map((log: any) => ({
    id: log.id,
    timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString("pt-BR") : "—",
    user: log.userId || "Sistema",
    action: actionMap[log.action] || log.action,
    entity: log.entityType || "—",
    description: log.description || `${actionMap[log.action] || log.action} ${log.entityType || ""}`,
    details: {
      entityId: log.entityId,
      entityName: log.entityType,
      oldValue: log.oldValue,
      newValue: log.newValue,
    },
    ipAddress: log.ipAddress || "—",
    userAgent: log.userAgent || "—",
  }));

  const getActionIcon = (action: string) => {
    switch (action) {
      case "criar":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "editar":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "deletar":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "visualizar":
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "criar":
        return "Criado";
      case "editar":
        return "Editado";
      case "deletar":
        return "Deletado";
      case "visualizar":
        return "Visualizado";
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "criar":
        return "bg-green-100 text-green-800";
      case "editar":
        return "bg-blue-100 text-blue-800";
      case "deletar":
        return "bg-red-100 text-red-800";
      case "visualizar":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    if (filters.action !== "todos" && log.action !== filters.action) {
      return false;
    }
    if (
      filters.user &&
      !log.user.toLowerCase().includes(filters.user.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      action: "todos",
      user: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Auditoria</h1>
            <p className="text-muted-foreground">
              Logs de todas as ações na plataforma -{" "}
              {typeof selectedTenant === "string"
                ? selectedTenant
                : selectedTenant?.name}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Filtros */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ação</label>
                  <Select
                    value={filters.action}
                    onValueChange={value => handleFilterChange("action", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas as ações</SelectItem>
                      <SelectItem value="criar">Criado</SelectItem>
                      <SelectItem value="editar">Editado</SelectItem>
                      <SelectItem value="deletar">Deletado</SelectItem>
                      <SelectItem value="visualizar">Visualizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário</label>
                  <Input
                    placeholder="Filtrar por usuário..."
                    value={filters.user}
                    onChange={e => handleFilterChange("user", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Inicial</label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={e =>
                      handleFilterChange("dateFrom", e.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Final</label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={e => handleFilterChange("dateTo", e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
                <Button
                  onClick={() => {
                    const report = generateAuditReport(filteredLogs);
                    exportToPDF(
                      report,
                      `auditoria_${new Date().toISOString().split("T")[0]}.txt`
                    );
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Texto
                </Button>
                <Button
                  onClick={() => {
                    exportToJSON(
                      filteredLogs,
                      `auditoria_${new Date().toISOString().split("T")[0]}.json`
                    );
                  }}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar JSON
                </Button>
                <Button
                  onClick={() => {
                    exportToExcel(
                      filteredLogs,
                      `auditoria_${new Date().toISOString().split("T")[0]}.xlsx`,
                      "Auditoria"
                    );
                  }}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumo */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Total de Ações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{auditLogs.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Criações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {auditLogs.filter(l => l.action === "criar").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Edições</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {auditLogs.filter(l => l.action === "editar").length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Deleções</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {auditLogs.filter(l => l.action === "deletar").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Ações</CardTitle>
            <CardDescription>
              {filteredLogs.length} ação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="mt-1">{getActionIcon(log.action)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{log.description}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getActionColor(
                          log.action
                        )}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{log.user}</span>
                      </div>
                      <div>
                        <span>{log.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-xs">IP: {log.ipAddress}</span>
                      </div>
                      <div>
                        <span className="text-xs truncate">
                          {log.userAgent}
                        </span>
                      </div>
                    </div>

                    {/* Detalhes da Mudança */}
                    {log.details.oldValue && log.details.newValue && (
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                          Ver detalhes da mudança
                        </summary>
                        <div className="mt-2 p-2 bg-gray-50 rounded space-y-2">
                          <div>
                            <p className="font-medium text-gray-700">Antes:</p>
                            <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto">
                              {JSON.stringify(log.details.oldValue, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Depois:</p>
                            <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-auto">
                              {JSON.stringify(log.details.newValue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Informações sobre Auditoria */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Sobre a Auditoria</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              • Todas as ações na plataforma são registradas automaticamente
            </p>
            <p>
              • Os logs incluem informações do usuário, IP, navegador e
              timestamp
            </p>
            <p>• Mudanças de dados mostram valores antes e depois</p>
            <p>• Os logs são mantidos por 2 anos para conformidade legal</p>
            <p>• Você pode filtrar e exportar logs para análise</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
