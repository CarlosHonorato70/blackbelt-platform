import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  ArrowRight,
  ClipboardCheck,
  Building2,
  Lock,
  Zap,
  Bot,
  Search,
  Brain,
  Target,
  Award,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck,
  Globe,
  Sparkles,
  TrendingUp,
  Eye,
} from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useState } from "react";

/* ── Pricing Plans ── */
const plans = [
  {
    name: "Starter",
    price: "R$ 297",
    period: "/mes",
    description: "Para consultores iniciando na NR-01",
    extra: "R$ 97/empresa adicional",
    features: [
      "Ate 3 empresas incluidas",
      "SamurAI basico (cadastro + COPSOQ)",
      "Relatorios padrao",
      "Exportacao PDF",
      "Suporte por email",
    ],
    cta: "Comecar Agora",
    popular: false,
  },
  {
    name: "Professional",
    price: "R$ 597",
    period: "/mes",
    description: "Para consultorias em crescimento",
    extra: "R$ 79/empresa adicional",
    features: [
      "Ate 10 empresas incluidas",
      "SamurAI completo (10 fases)",
      "Propostas comerciais automaticas",
      "PDF export ilimitado",
      "Benchmark setorial",
      "Suporte prioritario",
    ],
    cta: "Comecar Agora",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "R$ 997",
    period: "/mes",
    description: "Para grandes consultorias",
    extra: "R$ 59/empresa adicional",
    features: [
      "Ate 30 empresas incluidas",
      "Tudo do Professional",
      "White-label (sua marca)",
      "API access",
      "Relatorios personalizados",
      "Suporte dedicado",
    ],
    cta: "Comecar Agora",
    popular: false,
  },
];

/* ── Features Grid ── */
const features = [
  {
    icon: Bot,
    title: "SamurAI Agent",
    description:
      "Agente de IA que automatiza todo o ciclo NR-01: do CNPJ ao certificado.",
  },
  {
    icon: ClipboardCheck,
    title: "COPSOQ-II Completo",
    description:
      "76 questoes, 12 dimensoes de risco psicossocial com calculo automatico.",
  },
  {
    icon: ShieldCheck,
    title: "Conformidade NR-01",
    description:
      "Documentacao pronta para fiscalizacao conforme Portaria MTE 1.419/2024.",
  },
  {
    icon: BarChart3,
    title: "Benchmark Setorial",
    description:
      "Compare resultados entre empresas e setores para insights estrategicos.",
  },
  {
    icon: FileText,
    title: "PDF Export & Edicao",
    description:
      "Edicao inline de propostas, relatorios e certificados com exportacao PDF.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant",
    description:
      "Gerencie multiplas empresas com isolamento total de dados e white-label.",
  },
  {
    icon: Lock,
    title: "LGPD & Seguranca",
    description:
      "2FA, RBAC, criptografia, anonimizacao e exportacao de dados do titular.",
  },
  {
    icon: Eye,
    title: "Canal de Denuncias",
    description:
      "Canal anonimo integrado para relatos de riscos psicossociais.",
  },
];

/* ── SamurAI 10 Phases ── */
const samuraiPhases = [
  { icon: Search, title: "Cadastro", desc: "CNPJ > dados automaticos da Receita Federal" },
  { icon: Brain, title: "Diagnostico", desc: "Analise do porte, setor e riscos iniciais" },
  { icon: ClipboardCheck, title: "Avaliacao", desc: "COPSOQ-II automatizado para colaboradores" },
  { icon: BarChart3, title: "Analise", desc: "Scores de risco por dimensao e setor" },
  { icon: FileCheck, title: "Inventario", desc: "Inventario de riscos psicossociais" },
  { icon: Target, title: "Plano de Acao", desc: "Intervencoes priorizadas com prazos" },
  { icon: Users, title: "Treinamentos", desc: "Programas de capacitacao sugeridos" },
  { icon: FileText, title: "Documentacao", desc: "PGR, PCMSO e laudos gerados" },
  { icon: Award, title: "Certificacao", desc: "Certificado de conformidade NR-01" },
  { icon: Bell, title: "Monitoramento", desc: "Alertas de prazos e reavaliacoes" },
];

/* ── Stats ── */
const stats = [
  { value: "10", label: "Fases automatizadas" },
  { value: "76", label: "Questoes COPSOQ-II" },
  { value: "12", label: "Dimensoes avaliadas" },
  { value: "100%", label: "Digital e seguro" },
];

/* ── FAQ ── */
const faqItems = [
  {
    q: "O que e a NR-01 e por que preciso me adequar?",
    a: "A NR-01 (Portaria MTE 1.419/2024) exige que empresas identifiquem e gerenciem riscos psicossociais no ambiente de trabalho. O descumprimento pode gerar multas e interdicoes. Nossa plataforma automatiza todo o processo de conformidade.",
  },
  {
    q: "Como o SamurAI funciona?",
    a: "O SamurAI e um agente de inteligencia artificial que recebe apenas o CNPJ da empresa e automatiza as 10 fases da conformidade NR-01: desde a busca de dados na Receita Federal ate a emissao do certificado e monitoramento continuo.",
  },
  {
    q: "Preciso ter conhecimento tecnico para usar a plataforma?",
    a: "Nao. A plataforma foi projetada para consultores de SST e gestores de RH. O SamurAI guia todo o processo automaticamente. Voce so precisa revisar e aprovar os documentos gerados.",
  },
  {
    q: "Os dados dos colaboradores estao seguros?",
    a: "Sim. Utilizamos criptografia, autenticacao em dois fatores (2FA), controle de acesso por perfil (RBAC), isolamento de dados por empresa e conformidade total com a LGPD, incluindo exportacao e exclusao de dados pessoais.",
  },
  {
    q: "Posso usar minha propria marca (white-label)?",
    a: "Sim! No plano Enterprise, voce pode personalizar a plataforma com sua marca, logo e cores. Seus clientes verao apenas a identidade visual da sua consultoria.",
  },
  {
    q: "Qual o formato do questionario utilizado?",
    a: "Utilizamos o COPSOQ-II (Copenhagen Psychosocial Questionnaire), padrao internacional com 76 questoes distribuidas em 12 dimensoes psicossociais. Os colaboradores respondem pelo celular ou computador.",
  },
];

export default function Landing() {
  usePageMeta({
    title: "Gestao de Riscos Psicossociais | SamurAI",
    description:
      "Automatize a conformidade NR-01 com inteligencia artificial. SamurAI: do CNPJ ao certificado em minutos.",
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white">
      {/* ══════════ Navbar ══════════ */}
      <nav className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded" />
            <span className="font-bold text-lg text-white">
              BlackBelt Consultoria
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-300">
            <a href="#samurai" className="hover:text-amber-400 transition-colors">
              SamurAI
            </a>
            <a href="#features" className="hover:text-amber-400 transition-colors">
              Funcionalidades
            </a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">
              Planos
            </a>
            <a href="#faq" className="hover:text-amber-400 transition-colors">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="sm"
                className="font-semibold text-gray-900 hover:opacity-90"
                style={{ backgroundColor: "#c8a55a" }}
              >
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════ Hero ══════════ */}
      <section
        className="relative py-24 md:py-32 px-4 overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,165,90,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,165,90,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative max-w-5xl mx-auto text-center">
          <Badge
            className="mb-6 text-xs font-medium px-4 py-1.5 border-amber-500/30 text-amber-300 bg-amber-500/10"
            variant="outline"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Powered by SamurAI — Inteligencia Artificial
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Automatize a conformidade{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #c8a55a 0%, #f0d78c 50%, #c8a55a 100%)",
              }}
            >
              NR-01
            </span>
            <br />
            com Inteligencia Artificial
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Do CNPJ ao certificado em minutos, nao meses. O SamurAI automatiza as 10
            fases da gestao de riscos psicossociais para consultores de SST e
            empresas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="text-lg px-10 h-14 font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "#c8a55a", color: "#1a1a2e" }}
              >
                Comecar Agora
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#samurai">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-10 h-14 border-gray-600 text-gray-300 hover:bg-white/5 hover:border-gray-400"
              >
                <Bot className="w-5 h-5 mr-2" />
                Conhecer o SamurAI
              </Button>
            </a>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            14 dias gratis. Sem cartao de credito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* ══════════ Pain Points ══════════ */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Voce ainda faz avaliacao psicossocial{" "}
              <span className="text-red-500">manualmente?</span>
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Consultores perdem semanas em processos que o SamurAI resolve em minutos.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                title: "Semanas perdidas",
                desc: "Coleta manual de dados, planilhas e documentos que ninguem le.",
                color: "#ef4444",
              },
              {
                icon: Target,
                title: "Erros humanos",
                desc: "Calculos incorretos, dimensoes ignoradas e relatorios inconsistentes.",
                color: "#ef4444",
              },
              {
                icon: Bell,
                title: "Prazos estourados",
                desc: "Sem controle de vencimentos, reavaliacoes e notificacoes automaticas.",
                color: "#ef4444",
              },
              {
                icon: FileText,
                title: "Sem padronizacao",
                desc: "Cada consultor faz de um jeito. Sem processo, sem escala.",
                color: "#ef4444",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${item.color}10` }}
                >
                  <item.icon className="w-6 h-6" style={{ color: item.color }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <a href="#samurai">
              <Button
                variant="link"
                className="text-base font-semibold"
                style={{ color: "#c8a55a" }}
              >
                Veja como o SamurAI resolve tudo isso
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ SamurAI — 10 Phases ══════════ */}
      <section className="py-20 px-4" id="samurai" style={{ background: "#0a0a0a" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge
              className="mb-4 text-xs font-medium px-3 py-1 border-amber-500/30 text-amber-400 bg-amber-500/10"
              variant="outline"
            >
              <Bot className="w-3.5 h-3.5 mr-1.5" />
              Agente de IA
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              SamurAI:{" "}
              <span style={{ color: "#c8a55a" }}>
                10 fases, 1 clique
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Insira o CNPJ e o SamurAI conduz todo o processo de conformidade NR-01
              automaticamente. Do cadastro ao monitoramento continuo.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {samuraiPhases.map((phase, i) => (
              <div
                key={phase.title}
                className="relative bg-gray-900/80 border border-gray-800 rounded-xl p-5 hover:border-amber-500/40 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-gray-900 flex-shrink-0"
                    style={{ backgroundColor: "#c8a55a" }}
                  >
                    {i + 1}
                  </div>
                  <phase.icon className="w-5 h-5 text-gray-500 group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">
                  {phase.title}
                </h3>
                <p className="text-xs text-gray-500">{phase.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link to="/register">
              <Button
                size="lg"
                className="text-base px-8 h-12 font-bold hover:scale-[1.02] transition-transform"
                style={{ backgroundColor: "#c8a55a", color: "#1a1a2e" }}
              >
                Testar SamurAI Gratis
                <Sparkles className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ Stats ══════════ */}
      <section
        className="py-14 px-4 border-y border-gray-200"
        style={{ background: "linear-gradient(180deg, #fefdf8 0%, #fff 100%)" }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-4xl md:text-5xl font-extrabold mb-1"
                style={{ color: "#c8a55a" }}
              >
                {s.value}
              </div>
              <div className="text-sm text-gray-500 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ Features Grid ══════════ */}
      <section className="py-20 px-4 bg-white" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Tudo que voce precisa para a NR-01
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">
              Plataforma completa com 48+ paginas, 9 modulos e automacao de ponta a ponta.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:shadow-lg hover:border-amber-200 transition-all group"
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: "rgba(200,165,90,0.1)" }}
                >
                  <feature.icon
                    className="w-5 h-5"
                    style={{ color: "#c8a55a" }}
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ More Platform Capabilities ══════════ */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              E muito mais...
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Globe, text: "Integracao eSocial" },
              { icon: TrendingUp, text: "Propostas comerciais com ROI" },
              { icon: Award, text: "Certificados de conformidade" },
              { icon: Users, text: "Convites em massa por email" },
              { icon: Zap, text: "Alertas e notificacoes automaticas" },
              { icon: ShieldCheck, text: "2FA e autenticacao segura" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-100"
              >
                <item.icon className="w-5 h-5 flex-shrink-0" style={{ color: "#c8a55a" }} />
                <span className="text-sm font-medium text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ Pricing ══════════ */}
      <section className="py-20 px-4 bg-white" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Planos que cabem no seu negocio
            </h2>
            <p className="text-gray-500 text-lg">
              14 dias gratis em todos os planos. Sem compromisso.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 relative transition-all ${
                  plan.popular
                    ? "bg-gray-950 text-white shadow-2xl shadow-gray-950/20 scale-[1.02] border-2 border-amber-500/50"
                    : "bg-white border-2 border-gray-200 hover:border-gray-300"
                }`}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full text-gray-900"
                    style={{ backgroundColor: "#c8a55a" }}
                  >
                    MAIS POPULAR
                  </div>
                )}
                <h3
                  className={`text-xl font-bold mb-1 ${
                    plan.popular ? "text-white" : "text-gray-900"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-5 ${
                    plan.popular ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {plan.description}
                </p>
                <div className="mb-1">
                  <span
                    className={`text-4xl font-extrabold ${
                      plan.popular ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`text-base ${
                      plan.popular ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  className={`text-xs mb-6 ${
                    plan.popular ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  {plan.extra}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: plan.popular ? "#c8a55a" : "#22c55e" }}
                      />
                      <span
                        className={
                          plan.popular ? "text-gray-300" : "text-gray-600"
                        }
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button
                    className={`w-full h-12 font-bold text-base transition-all hover:scale-[1.02] ${
                      plan.popular ? "text-gray-900" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    style={
                      plan.popular
                        ? { backgroundColor: "#c8a55a" }
                        : undefined
                    }
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="py-20 px-4 bg-gray-50" id="faq">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Perguntas Frequentes
            </h2>
            <p className="text-gray-500 text-lg">
              Tudo que voce precisa saber sobre a plataforma e a NR-01.
            </p>
          </div>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {item.q}
                  </span>
                  {openFaq === i ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-4">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ Final CTA ══════════ */}
      <section
        className="py-20 px-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 50%, #0f3460 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,165,90,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,165,90,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para automatizar a{" "}
            <span style={{ color: "#c8a55a" }}>NR-01</span>?
          </h2>
          <p className="text-gray-400 mb-8 text-lg">
            Junte-se a consultores que ja usam o SamurAI para entregar
            conformidade em minutos. Comece gratis hoje.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="text-lg px-10 h-14 font-bold shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "#c8a55a", color: "#1a1a2e" }}
              >
                Comecar Avaliacao Gratuita
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-6">
            14 dias gratis | Sem cartao de credito | Suporte incluso
          </p>
        </div>
      </section>

      {/* ══════════ Footer ══════════ */}
      <footer className="bg-gray-950 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded" />
                <span className="font-bold text-white">
                  BlackBelt Consultoria
                </span>
              </div>
              <p className="text-sm max-w-xs leading-relaxed">
                Plataforma SaaS para gestao de riscos psicossociais e conformidade
                NR-01. Automatize com SamurAI.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="font-semibold text-white text-sm mb-3">
                  Produto
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#samurai" className="hover:text-amber-400 transition-colors">
                      SamurAI
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="hover:text-amber-400 transition-colors">
                      Funcionalidades
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-amber-400 transition-colors">
                      Planos
                    </a>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-amber-400 transition-colors">
                      FAQ
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/terms" className="hover:text-amber-400 transition-colors">
                      Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-amber-400 transition-colors">
                      Politica de Privacidade
                    </Link>
                  </li>
                  <li>
                    <Link to="/lgpd" className="hover:text-amber-400 transition-colors">
                      LGPD - Direitos do Titular
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-3">
                  Conta
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/login" className="hover:text-amber-400 transition-colors">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-amber-400 transition-colors">
                      Criar Conta
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} BlackBelt Consultoria. Todos os
            direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
