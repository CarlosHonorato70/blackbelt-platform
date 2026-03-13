import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ClipboardCheck,
  Loader2,
  Plus,
  ChevronDown,
  ChevronRight,
  Shield,
  FileDown,
  Award,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const STATUS_CONFIG: Record<string, { label: string; color: string; badgeClass: string }> = {
  compliant: {
    label: "Conforme",
    color: "#22c55e",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  partial: {
    label: "Parcial",
    color: "#eab308",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  non_compliant: {
    label: "Não Conforme",
    color: "#ef4444",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
  not_applicable: {
    label: "N/A",
    color: "#9ca3af",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

export default function ComplianceChecklist() {
  usePageMeta({ title: "Checklist de Conformidade Legal" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { exportPdf, isExporting } = usePdfExport();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  if (!tenantId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione uma empresa para continuar.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const listQuery = trpc.complianceChecklist.list.useQuery({ tenantId });
  const scoreQuery = trpc.complianceChecklist.getComplianceScore.useQuery({ tenantId });

  const seedMutation = trpc.complianceChecklist.seedNr01Requirements.useMutation({
    onSuccess: () => {
      toast.success("Checklist NR-01 criado com sucesso!");
      listQuery.refetch();
      scoreQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar checklist");
    },
  });

  const updateStatusMutation = trpc.complianceChecklist.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      listQuery.refetch();
      scoreQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar status");
    },
  });

  const requirements = listQuery.data ?? [];
  const score = scoreQuery.data;

  // Group by category
  const categories = requirements.reduce((acc: Record<string, any[]>, req: any) => {
    const cat = req.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(req);
    return acc;
  }, {});

  // Pie chart data
  const pieData = score
    ? [
        { name: "Conforme", value: score.compliantCount ?? 0, color: "#22c55e" },
        { name: "Parcial", value: score.partialCount ?? 0, color: "#eab308" },
        { name: "Não Conforme", value: score.nonCompliantCount ?? 0, color: "#ef4444" },
        { name: "N/A", value: score.notApplicableCount ?? 0, color: "#9ca3af" },
      ].filter((d) => d.value > 0)
    : [];

  const compliancePercent = score?.complianceScore ?? 0;

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function handleStatusChange(requirementId: string, newStatus: string) {
    updateStatusMutation.mutate({ id: requirementId, tenantId: tenantId!, status: newStatus });
  }

  const isLoading = listQuery.isLoading || scoreQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Checklist de Conformidade Legal</h1>
              <p className="text-muted-foreground">
                Acompanhe a conformidade com os requisitos da NR-01
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => trpc.nr01Pdf.exportComplianceChecklist.mutate({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : requirements.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum requisito cadastrado</p>
              <p className="text-muted-foreground mb-6">
                Crie o checklist com os requisitos padrão da NR-01.
              </p>
              <Button
                onClick={() => seedMutation.mutate({ tenantId: tenantId! })}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Checklist NR-01
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Score Donut */}
            <Card>
              <CardHeader>
                <CardTitle>Score de Conformidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <ResponsiveContainer width={220} height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {pieData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center score */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold">{Math.round(compliancePercent)}%</p>
                        <p className="text-xs text-muted-foreground">Conforme</p>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-3">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm">
                          {entry.name}: <strong>{entry.value}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Prompt when score >= 80% */}
            {compliancePercent >= 80 && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900">
                        Conformidade atingiu {Math.round(compliancePercent)}%!
                      </p>
                      <p className="text-sm text-green-700">
                        Sua empresa está apta a receber o Certificado de Conformidade NR-01.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => window.location.href = "/compliance-certificate"}
                    >
                      <Award className="h-4 w-4 mr-1" />
                      Emitir Certificado
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requirements by Category */}
            <div className="space-y-3">
              {Object.entries(categories).map(([category, items]) => {
                const isExpanded = expandedCategories.has(category);
                return (
                  <Card key={category}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-semibold">{category}</span>
                        <Badge variant="secondary">{items.length} requisitos</Badge>
                      </div>
                    </button>
                    {isExpanded && (
                      <CardContent className="pt-0 space-y-2">
                        {items.map((req: any) => {
                          const config = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.non_compliant;
                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                  {req.code && (
                                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {req.code}
                                    </span>
                                  )}
                                  <Badge variant="outline" className={config.badgeClass}>
                                    {config.label}
                                  </Badge>
                                </div>
                                <p className="text-sm">{req.text || req.description}</p>
                              </div>
                              <Select
                                value={req.status}
                                onValueChange={(v) => handleStatusChange(req.id, v)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="compliant">Conforme</SelectItem>
                                  <SelectItem value="partial">Parcial</SelectItem>
                                  <SelectItem value="non_compliant">Não Conforme</SelectItem>
                                  <SelectItem value="not_applicable">N/A</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
