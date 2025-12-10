import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Eye,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth.tsx";

export default function AssessmentHistory() {
  const { user } = useAuth();
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");

  const assessmentsQuery = trpc.assessments.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const assessments = assessmentsQuery.data || [];
  const filteredAssessments = assessments.filter(
    a =>
      a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "critical":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de Avaliações</h1>
        <p className="text-gray-600 mt-2">
          Visualize e analise todas as avaliações COPSOQ-II realizadas
        </p>
      </div>

      {/* FILTROS */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="Buscar por título ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline">Filtrar</Button>
            <Button>Nova Avaliação</Button>
          </div>
        </CardContent>
      </Card>

      {/* LISTA DE AVALIACOES */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Todas ({filteredAssessments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">Concluídas</TabsTrigger>
          <TabsTrigger value="in_progress">Em Andamento</TabsTrigger>
          <TabsTrigger value="draft">Rascunhos</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredAssessments.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma avaliação encontrada
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAssessments.map(assessment => (
                <Card
                  key={assessment.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedAssessment(assessment.id)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {assessment.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {assessment.description}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline">
                            {new Date(
                              assessment.assessmentDate
                            ).toLocaleDateString("pt-BR")}
                          </Badge>
                          <Badge
                            className={
                              assessment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : assessment.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {assessment.status === "completed"
                              ? "Concluída"
                              : assessment.status === "in_progress"
                                ? "Em Andamento"
                                : "Rascunho"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredAssessments
            .filter(a => a.status === "completed")
            .map(assessment => (
              <Card
                key={assessment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{assessment.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {assessment.description}
                      </p>
                      <Badge className="mt-3 bg-green-100 text-green-800">
                        Concluída
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Relatório
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {filteredAssessments
            .filter(a => a.status === "in_progress")
            .map(assessment => (
              <Card
                key={assessment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{assessment.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {assessment.description}
                      </p>
                      <Badge className="mt-3 bg-blue-100 text-blue-800">
                        Em Andamento
                      </Badge>
                    </div>
                    <Button size="sm">Continuar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          {filteredAssessments
            .filter(a => a.status === "draft")
            .map(assessment => (
              <Card
                key={assessment.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{assessment.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {assessment.description}
                      </p>
                      <Badge className="mt-3 bg-gray-100 text-gray-800">
                        Rascunho
                      </Badge>
                    </div>
                    <Button size="sm">Editar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>
      </Tabs>

      {/* ESTATISTICAS */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {filteredAssessments.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {filteredAssessments.filter(a => a.status === "completed").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {
                filteredAssessments.filter(a => a.status === "in_progress")
                  .length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {filteredAssessments.filter(a => a.status === "draft").length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
