import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "R$ 99",
    period: "/mês",
    description: "Para consultores individuais e pequenas equipes",
    features: [
      "1 empresa",
      "Até 5 usuários",
      "Avaliações NR-01 ilimitadas",
      "Relatórios básicos",
      "Exportação PDF/Excel",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$ 399",
    period: "/mês",
    description: "Para consultorias em crescimento",
    features: [
      "Até 10 empresas",
      "Até 50 usuários por empresa",
      "Relatórios avançados",
      "API de integração",
      "Suporte prioritário",
      "SLA 99.0%",
    ],
    cta: "Começar Grátis",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Para grandes organizações",
    features: [
      "Empresas ilimitadas",
      "Usuários ilimitados",
      "White-label",
      "Webhooks + API completa",
      "Suporte dedicado 24/7",
      "SLA 99.9%",
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

const features = [
  {
    icon: ClipboardCheck,
    title: "Avaliações COPSOQ-II",
    description:
      "Questionário de 76 questões com cálculo automático de 12 dimensões de risco psicossocial.",
  },
  {
    icon: ShieldCheck,
    title: "Conformidade NR-01",
    description:
      "Atenda à Portaria MTE nº 1.419/2024 com relatórios e documentação prontos para fiscalização.",
  },
  {
    icon: BarChart3,
    title: "Analytics em Tempo Real",
    description:
      "Dashboards executivos com indicadores de risco, taxas de resposta e evolução temporal.",
  },
  {
    icon: Users,
    title: "Convites em Massa",
    description:
      "Envie questionários por email para centenas de colaboradores com rastreamento automático.",
  },
  {
    icon: Building2,
    title: "Multi-Tenant",
    description:
      "Gerencie múltiplas empresas clientes com isolamento total de dados e branding personalizado.",
  },
  {
    icon: FileText,
    title: "Planos de Ação",
    description:
      "Crie e acompanhe planos de intervenção com prazos, responsáveis e status de execução.",
  },
  {
    icon: Lock,
    title: "LGPD Compliant",
    description:
      "Dados criptografados, anonimização de respostas e exportação para atender direitos do titular.",
  },
  {
    icon: Zap,
    title: "Precificação Inteligente",
    description:
      "Calcule propostas comerciais automaticamente com base em parâmetros configuráveis.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded" />
            <span className="font-bold text-lg text-gray-900">
              Black Belt Platform
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Entrar
              </Button>
            </Link>
            <Link to="/register">
              <Button
                size="sm"
                className="text-white"
                style={{ backgroundColor: "#7C3AED" }}
              >
                Criar Conta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="relative py-24 px-4"
        style={{
          background:
            "linear-gradient(180deg, #4C1D95 0%, #5B21B6 50%, #6D28D9 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Gestão de Riscos Psicossociais
            <br />
            <span style={{ color: "#c8a55a" }}>NR-01 em Conformidade</span>
          </h1>
          <p className="text-lg md:text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Plataforma completa para consultores e empresas atenderem à Portaria
            MTE nº 1.419/2024. Avaliações COPSOQ-II, relatórios automáticos e
            planos de ação — tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button
                size="lg"
                className="text-lg px-8 h-12 font-semibold"
                style={{ backgroundColor: "#c8a55a", color: "#1F2937" }}
              >
                Teste Grátis por 14 Dias
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 h-12 border-white/30 text-white hover:bg-white/10"
              >
                Ver Planos
              </Button>
            </a>
          </div>
          <p className="text-purple-200 text-sm mt-4">
            Sem cartão de crédito. Cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Tudo o que você precisa para a NR-01
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Da aplicação do questionário COPSOQ-II até a geração de relatórios
              de conformidade — automatize todo o processo.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
              >
                <feature.icon
                  className="w-10 h-10 mb-4"
                  style={{ color: "#7C3AED" }}
                />
                <h3 className="font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-14">
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Configure",
                desc: "Cadastre sua empresa, setores e colaboradores em minutos.",
              },
              {
                step: "2",
                title: "Aplique",
                desc: "Envie o questionário COPSOQ-II por email. Colaboradores respondem pelo celular.",
              },
              {
                step: "3",
                title: "Atue",
                desc: "Receba relatórios automáticos com scores de risco e planos de ação sugeridos.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
                  style={{ backgroundColor: "#7C3AED" }}
                >
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 bg-gray-50" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Planos</h2>
            <p className="text-gray-600">
              14 dias grátis em todos os planos. Sem compromisso.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-8 border-2 relative ${
                  plan.popular
                    ? "border-purple-500 shadow-lg"
                    : "border-gray-200"
                }`}
              >
                {plan.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#7C3AED" }}
                  >
                    MAIS POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm"
                    >
                      <CheckCircle
                        className="w-4 h-4 mt-0.5 flex-shrink-0"
                        style={{ color: "#7C3AED" }}
                      />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/register">
                  <Button
                    className={`w-full h-11 font-semibold ${
                      plan.popular ? "text-white" : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    style={
                      plan.popular ? { backgroundColor: "#7C3AED" } : undefined
                    }
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 px-4"
        style={{
          background:
            "linear-gradient(135deg, #4C1D95 0%, #6D28D9 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para adequar sua empresa à NR-01?
          </h2>
          <p className="text-purple-100 mb-8">
            Comece agora mesmo com 14 dias grátis. Nenhum cartão de crédito
            necessário.
          </p>
          <Link to="/register">
            <Button
              size="lg"
              className="text-lg px-10 h-12 font-semibold"
              style={{ backgroundColor: "#c8a55a", color: "#1F2937" }}
            >
              Criar Conta Grátis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded" />
                <span className="font-bold text-white">
                  Black Belt Platform
                </span>
              </div>
              <p className="text-sm max-w-xs">
                Gestão completa de riscos psicossociais e conformidade NR-01
                para consultores e empresas.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <h4 className="font-semibold text-white text-sm mb-3">
                  Produto
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#features" className="hover:text-white">
                      Funcionalidades
                    </a>
                  </li>
                  <li>
                    <a href="#pricing" className="hover:text-white">
                      Planos
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white text-sm mb-3">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link to="/terms" className="hover:text-white">
                      Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-white">
                      Política de Privacidade
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
                    <Link to="/login" className="hover:text-white">
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className="hover:text-white">
                      Criar Conta
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 text-center text-xs">
            &copy; {new Date().getFullYear()} Black Belt Consultoria. Todos os
            direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
