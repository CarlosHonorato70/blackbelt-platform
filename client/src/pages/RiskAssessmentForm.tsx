import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTenant } from "@/contexts/TenantContext";
import { AlertCircle, ArrowLeft, CheckCircle2, Save } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function RiskAssessmentForm() {
  const { selectedTenant } = useTenant();
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    title: "",
    sector: "",
    assessmentDate: "",
    assessor: "",
    methodology: "",
    description: "",
    // Fatores de Risco Psicossociais (conforme guia MTE)
    organizationalFactors: "",
    workloadFactors: "",
    relationshipFactors: "",
    violenceFactors: "",
    // Avaliação de Gravidade
    riskLevel: "medium",
    affectedPeople: "",
    // Medidas de Controle
    preventionMeasures: "",
    controlMeasures: "",
    monitoringPlan: "",
  });

  const [submitted, setSubmitted] = useState(false);

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para criar uma avaliação de riscos
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrar com tRPC para salvar no banco de dados
    console.log("Formulário submetido:", formData);
    setSubmitted(true);
    setTimeout(() => {
      setLocation("/risk-assessments");
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/risk-assessments")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Nova Avaliação de Riscos Psicossociais
            </h1>
            <p className="text-muted-foreground">
              Empresa: {typeof selectedTenant === 'string' ? selectedTenant : selectedTenant?.name}
            </p>
          </div>
        </div>

        {submitted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-3 pt-6">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">
                  Avaliação criada com sucesso!
                </p>
                <p className="text-sm text-green-800">
                  Redirecionando para a listagem...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>1. Informações Básicas</CardTitle>
              <CardDescription>
                Dados gerais da avaliação de riscos psicossociais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Avaliação *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex: Avaliação Inicial - Setor Administrativo"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sector">Setor (Opcional)</Label>
                  <Select
                    value={formData.sector}
                    onValueChange={(value) =>
                      handleSelectChange("sector", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrativo">
                        Administrativo
                      </SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="geral">Geral (Empresa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessmentDate">Data da Avaliação *</Label>
                  <Input
                    id="assessmentDate"
                    name="assessmentDate"
                    type="date"
                    value={formData.assessmentDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assessor">Avaliador Responsável *</Label>
                  <Input
                    id="assessor"
                    name="assessor"
                    placeholder="Nome do profissional"
                    value={formData.assessor}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodology">Metodologia *</Label>
                  <Select
                    value={formData.methodology}
                    onValueChange={(value) =>
                      handleSelectChange("methodology", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a metodologia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso45003">ISO 45003</SelectItem>
                      <SelectItem value="whsq">WHSQ (WHO)</SelectItem>
                      <SelectItem value="blackbelt">Método Black Belt</SelectItem>
                      <SelectItem value="custom">Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição/Objetivo</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Descreva o objetivo e escopo desta avaliação..."
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção 2: Identificação de Fatores de Risco */}
          <Card>
            <CardHeader>
              <CardTitle>2. Identificação de Fatores de Risco Psicossociais</CardTitle>
              <CardDescription>
                Conforme Guia de Fatores de Riscos Psicossociais (MTE)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationalFactors">
                  Fatores Organizacionais
                </Label>
                <Textarea
                  id="organizationalFactors"
                  name="organizationalFactors"
                  placeholder="Ex: Falta de clareza nas funções, processos desorganizados, comunicação inadequada..."
                  rows={3}
                  value={formData.organizationalFactors}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Estrutura, processos, comunicação, liderança
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workloadFactors">Fatores de Carga de Trabalho</Label>
                <Textarea
                  id="workloadFactors"
                  name="workloadFactors"
                  placeholder="Ex: Excesso de horas, prazos irrealistas, demandas conflitantes..."
                  rows={3}
                  value={formData.workloadFactors}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Volume, intensidade, prazos, demandas conflitantes
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="relationshipFactors">
                  Fatores de Relacionamento
                </Label>
                <Textarea
                  id="relationshipFactors"
                  name="relationshipFactors"
                  placeholder="Ex: Conflitos interpessoais, falta de apoio, isolamento..."
                  rows={3}
                  value={formData.relationshipFactors}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Relações interpessoais, apoio social, liderança
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="violenceFactors">
                  Fatores de Violência e Assédio
                </Label>
                <Textarea
                  id="violenceFactors"
                  name="violenceFactors"
                  placeholder="Ex: Assédio moral, discriminação, violência física..."
                  rows={3}
                  value={formData.violenceFactors}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Violência, assédio, discriminação, bullying
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Seção 3: Avaliação de Gravidade */}
          <Card>
            <CardHeader>
              <CardTitle>3. Avaliação de Gravidade</CardTitle>
              <CardDescription>
                Classificação do nível de risco identificado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="riskLevel">Nível de Risco *</Label>
                  <Select
                    value={formData.riskLevel}
                    onValueChange={(value) =>
                      handleSelectChange("riskLevel", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixo</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="high">Alto</SelectItem>
                      <SelectItem value="critical">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affectedPeople">
                    Número de Pessoas Afetadas
                  </Label>
                  <Input
                    id="affectedPeople"
                    name="affectedPeople"
                    type="number"
                    placeholder="Ex: 25"
                    value={formData.affectedPeople}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção 4: Medidas de Controle */}
          <Card>
            <CardHeader>
              <CardTitle>4. Medidas de Controle e Prevenção</CardTitle>
              <CardDescription>
                Ações para mitigar riscos identificados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preventionMeasures">
                  Medidas de Prevenção Primária
                </Label>
                <Textarea
                  id="preventionMeasures"
                  name="preventionMeasures"
                  placeholder="Ações para eliminar ou reduzir os riscos na fonte..."
                  rows={3}
                  value={formData.preventionMeasures}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Mudanças organizacionais, processos, políticas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="controlMeasures">
                  Medidas de Controle Secundário
                </Label>
                <Textarea
                  id="controlMeasures"
                  name="controlMeasures"
                  placeholder="Ações para minimizar exposição aos riscos..."
                  rows={3}
                  value={formData.controlMeasures}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Treinamentos, procedimentos, equipamentos
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monitoringPlan">Plano de Monitoramento</Label>
                <Textarea
                  id="monitoringPlan"
                  name="monitoringPlan"
                  placeholder="Como será feito o acompanhamento das medidas implementadas..."
                  rows={3}
                  value={formData.monitoringPlan}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Frequência, indicadores, responsáveis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/risk-assessments")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitted}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Avaliação
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

