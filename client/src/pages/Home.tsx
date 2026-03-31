import { useAuth } from "@/_core/hooks/useAuth.tsx";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Users,
  Shield,
  Brain,
  ClipboardList,
  GraduationCap,
  Target,
  ChevronRight,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useTenant } from "@/contexts/TenantContext";

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isImpersonating } = useImpersonation();
  const { selectedTenant } = useTenant();

  // Dados do tenant
  const { data: tenantInfo } = trpc.companies.getMyTenantInfo.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const isAdmin = user?.role === "admin";
  const isConsultant = isAdmin || tenantInfo?.tenantType === "consultant";
  const isCompanyUser = tenantInfo?.tenantType === "company";

  // Dados para consultor: lista de empresas
  const { data: companiesData } = trpc.companies.list.useQuery({}, {
    retry: false,
    enabled: isConsultant && !isAdmin,
  });

  // Dados para admin: todos tenants
  const { data: tenantsData } = trpc.tenants.list.useQuery(undefined, {
    enabled: isAdmin,
  });

  // Dados contextuais (empresa selecionada ou própria)
  const { data: peopleData } = trpc.people.list.useQuery({}, {
    retry: false,
    enabled: !!user,
  });

  const { data: assessmentsData } = trpc.assessments.list.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const { data: riskData } = trpc.riskAssessments.list.useQuery({}, {
    retry: false,
    enabled: !!user,
  });

  const { data: trainingData } = trpc.training.listPrograms.useQuery(undefined, {
    retry: false,
    enabled: !!user,
  });

  const companies = companiesData?.companies ?? [];
  const totalCompanies = companiesData?.total ?? 0;
  const totalPeople = Array.isArray(peopleData) ? peopleData.length : 0;
  const totalAssessments = Array.isArray(assessmentsData) ? assessmentsData.length : 0;
  const totalRisks = Array.isArray(riskData) ? riskData.length : 0;
  const totalTraining = Array.isArray(trainingData) ? trainingData.length : 0;

  // Contexto: empresa selecionada ou visão geral
  const contextLabel = isImpersonating && selectedTenant
    ? selectedTenant.name
    : isCompanyUser
    ? tenantInfo?.name || "Minha Empresa"
    : "Visão Geral";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bem-vindo(a), <span className="text-[#c8a55a]">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Administrador Master" : isConsultant ? "Consultoria" : "Empresa"} • {contextLabel}
          </p>
          {isImpersonating && selectedTenant && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
              <Building2 className="h-3 w-3" />
              Visualizando dados de: <strong>{selectedTenant.name}</strong>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Empresas — só consultor/admin */}
          {isConsultant && (
            <Card className="border-l-4 border-l-[#c8a55a] hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/companies")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Empresas</CardTitle>
                <div className="p-1.5 rounded-lg bg-[#c8a55a]/10">
                  <Building2 className="h-4 w-4 text-[#c8a55a]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isAdmin ? (tenantsData?.length ?? 0) : totalCompanies}</div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {isAdmin ? "tenants cadastrados" : "empresas gerenciadas"}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Colaboradores */}
          <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/people")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Colaboradores</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-50">
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPeople}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isImpersonating ? "nesta empresa" : "cadastrados"}
              </p>
            </CardContent>
          </Card>

          {/* Avaliações COPSOQ */}
          <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/copsoq/analytics")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avaliações COPSOQ</CardTitle>
              <div className="p-1.5 rounded-lg bg-blue-50">
                <ClipboardList className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAssessments}</div>
              <p className="text-[10px] text-muted-foreground mt-1">questionários aplicados</p>
            </CardContent>
          </Card>

          {/* Inventários de Risco */}
          <Card className="border-l-4 border-l-orange-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/risk-assessments")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Inventários de Risco</CardTitle>
              <div className="p-1.5 rounded-lg bg-orange-50">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRisks}</div>
              <p className="text-[10px] text-muted-foreground mt-1">avaliações de risco</p>
            </CardContent>
          </Card>

          {/* Treinamentos — se não mostrou Empresas, mostra este */}
          {!isConsultant && (
            <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/training")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Treinamentos</CardTitle>
                <div className="p-1.5 rounded-lg bg-purple-50">
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTraining}</div>
                <p className="text-[10px] text-muted-foreground mt-1">programas ativos</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ações Rápidas — Consultor */}
        {isConsultant && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ações Rápidas</h2>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start gap-3 border-[#c8a55a]/20 hover:border-[#c8a55a] hover:bg-[#c8a55a]/5"
                onClick={() => navigate("/agent")}
              >
                <div className="p-2 rounded-lg bg-[#c8a55a]/10">
                  <Brain className="h-5 w-5 text-[#c8a55a]" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">SamurAI</div>
                  <div className="text-xs text-muted-foreground">Agente de IA para NR-01</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-start gap-3 hover:border-emerald-400 hover:bg-emerald-50"
                onClick={() => navigate("/companies")}
              >
                <div className="p-2 rounded-lg bg-emerald-50">
                  <Plus className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Nova Empresa</div>
                  <div className="text-xs text-muted-foreground">Cadastrar empresa cliente</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 justify-start gap-3 hover:border-blue-400 hover:bg-blue-50"
                onClick={() => navigate("/executive-dashboard")}
              >
                <div className="p-2 rounded-lg bg-blue-50">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm">Dashboard Executivo</div>
                  <div className="text-xs text-muted-foreground">Visão consolidada</div>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </Button>
            </div>
          </div>
        )}

        {/* Lista de Empresas — Consultor */}
        {isConsultant && !isAdmin && companies.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Minhas Empresas</h2>
              <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/companies")}>
                Ver todas <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid gap-2">
              {companies.slice(0, 5).map((company: any) => (
                <Card
                  key={company.id}
                  className="hover:shadow-md transition-all cursor-pointer hover:border-[#c8a55a]/30"
                  onClick={() => navigate("/companies")}
                >
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <div className="p-2 rounded-lg bg-slate-100">
                      <Building2 className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.cnpj}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        company.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {company.status === "active" ? "Ativa" : company.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info NR-01 — Empresa */}
        {isCompanyUser && (
          <Card className="border-[#c8a55a]/20 bg-gradient-to-br from-[#0f1a2e] to-[#1e3a5f] text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#c8a55a]" />
                Conformidade NR-01
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300">
                A NR-01 exige que sua empresa identifique, avalie e controle os
                <strong className="text-white"> fatores de risco psicossociais</strong> relacionados ao trabalho.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-[#c8a55a]">{totalAssessments}</div>
                  <div className="text-[10px] text-slate-400">Avaliações</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-[#c8a55a]">{totalRisks}</div>
                  <div className="text-[10px] text-slate-400">Riscos Mapeados</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-xl font-bold text-[#c8a55a]">{totalTraining}</div>
                  <div className="text-[10px] text-slate-400">Treinamentos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
