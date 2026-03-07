import { useAuth } from "@/_core/hooks/useAuth.tsx";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Award,
  Building2,
  FileText,
  Heart,
  HelpCircle,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Home() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();
  const { data: tenants } = trpc.tenants.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const stats = [
    {
      title: "Empresas Atendidas",
      value: tenants?.length || 0,
      icon: Building2,
      description: "Clientes ativos na plataforma",
      visible: user?.role === "admin",
      color: "text-primary",
      bgIcon: "bg-primary/10",
    },
    {
      title: "Colaboradores",
      value: "-",
      icon: Users,
      description: "Total de colaboradores cadastrados",
      visible: true,
      color: "text-emerald-600",
      bgIcon: "bg-emerald-50",
    },
    {
      title: "Avaliações NR-01",
      value: "-",
      icon: Shield,
      description: "Avaliações de riscos psicossociais",
      visible: true,
      color: "text-gold",
      bgIcon: "bg-gold-light",
    },
    {
      title: "Programas Ativos",
      value: "-",
      icon: Activity,
      description: "Treinamentos e mentorias em andamento",
      visible: true,
      color: "text-sky-600",
      bgIcon: "bg-sky-50",
    },
  ];

  const services = [
    {
      icon: Shield,
      title: "Gestão de Riscos Psicossociais (NR-01)",
      description:
        "Avaliação completa dos fatores de risco psicossociais conforme Portaria MTE nº 1.419/2024. Identificação, avaliação e controle de riscos relacionados ao trabalho.",
      features: [
        "Inventário de riscos",
        "Matriz de probabilidade x gravidade",
        "Plano de ação integrado",
        "Compliance legal",
      ],
    },
    {
      icon: Heart,
      title: "Programas de Resiliência e Alta Performance",
      description:
        "Metodologias exclusivas baseadas na experiência de Carlos Honorato (20 anos PRF/Exército + 9.000 atendimentos) e Thyberê Mendes (gestão ágil + artes marciais).",
      features: [
        "Método Black Belt de Resiliência",
        "Desenvolvimento de liderança",
        "Gestão de estresse",
        "Mentalidade de campeão",
      ],
    },
    {
      icon: TrendingUp,
      title: "Desenvolvimento de Lideranças",
      description:
        "Capacitação de gestores com disciplina tática, visão estratégica e inteligência emocional para ambientes de alta pressão e competitividade.",
      features: [
        "Mentorias personalizadas",
        "Workshops imersivos",
        "Gestão de conflitos",
        "Comunicação assertiva",
      ],
    },
    {
      icon: Award,
      title: "Transformação Cultural Organizacional",
      description:
        "Não apenas compliance, mas transformação profunda da cultura organizacional focada em alta performance, bem-estar e engajamento.",
      features: [
        "Diagnóstico organizacional",
        "Clima e cultura",
        "Indicadores de saúde mental",
        "Acompanhamento contínuo",
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">
                Black Belt{" "}
                <span className="text-gold">Consultoria</span>
              </h1>
              <div className="h-1 w-24 bg-gradient-to-r from-primary to-[#c8a55a] rounded-full mt-2" />
            </div>
            <Button
              onClick={() => setShowOnboarding(true)}
              variant="outline"
              className="gap-2 border-[#c8a55a]/30 hover:border-[#c8a55a] hover:bg-[#c8a55a]/5"
            >
              <HelpCircle className="h-4 w-4 text-gold" />
              Guia
            </Button>
          </div>
          <p className="text-lg text-muted-foreground">
            Plataforma de Gestão de Riscos Psicossociais e Desenvolvimento
            Humano
          </p>
          <p className="text-sm text-muted-foreground">
            Bem-vindo(a), <span className="font-semibold text-foreground">{user?.name}</span> •{" "}
            {user?.role === "admin" ? "Administrador" : "Usuário"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats
            .filter(stat => stat.visible)
            .map(stat => (
              <Card key={stat.title} className="border-l-4 border-l-[#c8a55a] hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgIcon}`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Services Overview */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-foreground">Nossos Serviços</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[#c8a55a]/40 to-transparent" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {services.map(service => (
              <Card
                key={service.title}
                className="hover:shadow-lg transition-all hover:border-[#c8a55a]/30 group"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-[#c8a55a]/10 transition-colors">
                      <service.icon className="h-6 w-6 text-primary group-hover:text-gold transition-colors" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{service.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {service.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map(feature => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-[#c8a55a]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Compliance Info */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>
                  Conformidade NR-01 (Portaria MTE nº 1.419/2024)
                </CardTitle>
                <CardDescription>
                  Vigência a partir de 26/05/2025
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm text-muted-foreground">
                A nova redação da NR-01 inclui expressamente os{" "}
                <strong className="text-foreground">
                  fatores de risco psicossociais relacionados ao trabalho
                </strong>{" "}
                no Gerenciamento de Riscos Ocupacionais (GRO). Nossa plataforma
                oferece ferramentas completas para:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Identificação
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mapeamento completo de riscos psicossociais
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <TrendingUp className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Avaliação
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Análise de gravidade e probabilidade
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-background rounded-lg">
                  <Activity className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Controle
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Planos de ação e acompanhamento
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Founder Philosophy */}
        <Card className="bg-gradient-to-br from-[#0f1a2e] to-[#1e3a5f] text-white border-[#c8a55a]/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#c8a55a]/20 rounded-lg">
                <Award className="h-6 w-6 text-[#c8a55a]" />
              </div>
              <div>
                <CardTitle className="text-white">
                  Filosofia Black Belt
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Baseada na experiência e legado dos fundadores
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-[#c8a55a]">
                  Carlos Honorato
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    20 anos de experiência PRF e Exército
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Mais de 9.000 atendimentos clínicos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Faixa preta 4º grau em Jiu-Jitsu
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Campeão mundial de artes marciais
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Especialista em psicanálise e hipnose clínica
                  </li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-[#c8a55a]">Thyberê Mendes</h4>
                <ul className="space-y-1.5 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Gestão ágil e otimização de processos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Alta performance em artes marciais
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Análise de requisitos complexos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Desenvolvimento de equipes de elite
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-[#c8a55a]" />
                    Mentalidade de campeão aplicada ao corporativo
                  </li>
                </ul>
              </div>
            </div>
            <div className="pt-4 border-t border-[#c8a55a]/20">
              <p className="text-sm text-slate-300 italic">
                "A maestria (o Black Belt) se alcança através de técnica
                apurada, disciplina rigorosa e uma busca incansável por ir além
                do óbvio e reinventar."
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <OnboardingGuide open={showOnboarding} onOpenChange={setShowOnboarding} />
    </DashboardLayout>
  );
}
