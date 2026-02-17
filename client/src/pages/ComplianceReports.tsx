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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import {
  exportToJSON,
  exportToExcel,
  generateComplianceReport,
  exportToPDF,
} from "@/lib/exportUtils";

export default function ComplianceReports() {
  const { selectedTenant } = useTenant();
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para visualizar relatórios de compliance
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Mock data - será substituído por dados reais do backend
  const reports = [
    {
      id: "1",
      title: "Avaliação Inicial - Setor Administrativo",
      date: "15/01/2025",
      assessor: "Carlos Honorato",
      status: "completo",
      compliance: 75,
      riskLevel: "médio",
    },
    {
      id: "2",
      title: "Reavaliação Anual - Produção",
      date: "10/01/2025",
      assessor: "Thyberê Mendes",
      status: "parcial",
      compliance: 60,
      riskLevel: "alto",
    },
  ];

  const complianceChecklist = [
    {
      item: "Identificação de Riscos Psicossociais",
      completed: true,
      description: "Mapeamento completo dos fatores de risco",
    },
    {
      item: "Avaliação de Gravidade",
      completed: true,
      description: "Classificação de nível de risco para cada fator",
    },
    {
      item: "Plano de Ação",
      completed: true,
      description: "Medidas de controle e prevenção definidas",
    },
    {
      item: "Comunicação aos Colaboradores",
      completed: true,
      description: "Divulgação dos resultados e planos de ação",
    },
    {
      item: "Monitoramento Contínuo",
      completed: false,
      description: "Sistema de acompanhamento implementado",
    },
    {
      item: "Documentação Completa",
      completed: false,
      description: "Arquivos e registros organizados",
    },
    {
      item: "Treinamento de Gestores",
      completed: false,
      description: "Capacitação sobre gestão de riscos psicossociais",
    },
    {
      item: "Revisão Periódica",
      completed: false,
      description: "Reavaliação conforme cronograma estabelecido",
    },
  ];

  const actionPlan = [
    {
      id: "1",
      action: "Implementar sistema de feedback anônimo",
      category: "Organizacional",
      priority: "alta",
      deadline: "28/02/2025",
      responsible: "RH",
      status: "em andamento",
    },
    {
      id: "2",
      action: "Revisar distribuição de carga de trabalho",
      category: "Carga de Trabalho",
      priority: "alta",
      deadline: "31/03/2025",
      responsible: "Gestores",
      status: "não iniciado",
    },
    {
      id: "3",
      action: "Iniciar programa de mentoria",
      category: "Relacionamento",
      priority: "média",
      deadline: "30/04/2025",
      responsible: "RH",
      status: "não iniciado",
    },
    {
      id: "4",
      action: "Fortalecer política anti-assédio",
      category: "Violência/Assédio",
      priority: "crítica",
      deadline: "15/02/2025",
      responsible: "Diretoria",
      status: "em andamento",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completo":
        return "bg-green-100 text-green-800";
      case "parcial":
        return "bg-yellow-100 text-yellow-800";
      case "incompleto":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActionStatusColor = (status: string) => {
    switch (status) {
      case "concluído":
        return "bg-green-100 text-green-800";
      case "em andamento":
        return "bg-blue-100 text-blue-800";
      case "não iniciado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "crítica":
        return "text-red-600";
      case "alta":
        return "text-orange-600";
      case "média":
        return "text-yellow-600";
      case "baixa":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Relatórios de Compliance NR-01
          </h1>
          <p className="text-muted-foreground">
            Gestão de conformidade com Portaria MTE nº 1.419/2024 -{" "}
            {typeof selectedTenant === "string"
              ? selectedTenant
              : selectedTenant?.name}
          </p>
        </div>

        {/* Resumo de Compliance */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">
              Status Geral de Conformidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-blue-800">Taxa de Conformidade</p>
                <p className="text-3xl font-bold text-blue-900">67.5%</p>
                <p className="text-xs text-blue-700">5 de 8 itens completos</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-blue-800">Ações Planejadas</p>
                <p className="text-3xl font-bold text-blue-900">4</p>
                <p className="text-xs text-blue-700">
                  2 em andamento, 2 não iniciadas
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-blue-800">Próxima Reavaliação</p>
                <p className="text-3xl font-bold text-blue-900">180</p>
                <p className="text-xs text-blue-700">dias (até 15/07/2025)</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-blue-800">Conformidade Legal</p>
                <p className="text-3xl font-bold text-blue-900">✓</p>
                <p className="text-xs text-blue-700">Dentro do prazo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relatórios Disponíveis */}
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Disponíveis</CardTitle>
            <CardDescription>
              Avaliações de riscos psicossociais realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map(report => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{report.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {report.date} • Avaliador: {report.assessor}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Conformidade: {report.compliance}%
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setSelectedReport(report.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const reportText = generateComplianceReport([
                              report,
                            ]);
                            exportToPDF(
                              reportText,
                              `compliance_${report.id}_${new Date().toISOString().split("T")[0]}.txt`
                            );
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Texto
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            exportToJSON(
                              [report],
                              `compliance_${report.id}_${new Date().toISOString().split("T")[0]}.json`
                            );
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            exportToExcel(
                              [report],
                              `compliance_${report.id}_${new Date().toISOString().split("T")[0]}.xlsx`,
                              "Compliance"
                            );
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Exportar Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Checklist de Conformidade */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Conformidade NR-01</CardTitle>
            <CardDescription>
              Itens obrigatórios conforme Portaria MTE nº 1.419/2024
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceChecklist.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="mt-1">
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{item.item}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                      item.completed
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {item.completed ? "Completo" : "Pendente"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plano de Ação */}
        <Card>
          <CardHeader>
            <CardTitle>Plano de Ação Integrado</CardTitle>
            <CardDescription>
              Medidas para mitigar riscos identificados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actionPlan.map(action => (
                <div
                  key={action.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{action.action}</h4>
                      <p className="text-sm text-muted-foreground">
                        Categoria: {action.category}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`text-xs font-semibold ${getPriorityColor(
                          action.priority
                        )}`}
                      >
                        {action.priority.toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${getActionStatusColor(
                          action.status
                        )}`}
                      >
                        {action.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Responsável</p>
                      <p className="font-medium">{action.responsible}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prazo</p>
                      <p className="font-medium">{action.deadline}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Botão de Exportação */}
        <div className="flex gap-3 justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Exportar Relatório Completo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Relatório</DialogTitle>
                <DialogDescription>
                  Selecione o formato desejado para exportação
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar como PDF
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar como Excel
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar como Word
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </DashboardLayout>
  );
}
