import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  BookOpen,
  MessageCircle,
  FileText,
  Mail,
  Phone,
  Download,
  Loader2,
  Brain,
  Shield,
  ClipboardCheck,
  BarChart3,
  FileCheck,
  Users,
  HeadphonesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";

interface GuideItem {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: React.ReactNode;
}

const guideItems: GuideItem[] = [
  {
    id: "samurai",
    title: "SamurAI — Agente de IA",
    description: "Conduza todo o processo NR-01 com inteligência artificial",
    icon: <Brain className="w-5 h-5" />,
    content: `O SamurAI é o agente de IA que guia você por 10 fases automatizadas:

1. Onboarding — Cadastro da empresa (CNPJ automático)
2. Diagnóstico — Análise do perfil e estratégia
3. Configuração — Personalização da metodologia COPSOQ
4. Avaliação — Aplicação do COPSOQ-II (76 questões)
5. Análise — Identificação de dimensões críticas por IA
6. Inventário — Riscos psicossociais (13 tipos MTE)
7. Plano de Ação — Medidas com hierarquia de controles
8. Treinamento — Programas de capacitação
9. Documentação — PGR, PCMSO, laudos e relatórios
10. Certificação — Certificado NR-01 (score >= 80%)

Como usar: Menu > SamurAI > Informe o CNPJ e siga as orientações.`,
  },
  {
    id: "avaliacoes",
    title: "Avaliações de Riscos NR-01",
    description: "Inventário de riscos psicossociais com classificação GRO",
    icon: <Shield className="w-5 h-5" />,
    content: `O módulo de avaliações cria inventários de riscos conforme §1.5.7 da NR-01:

• 13 tipos de perigos psicossociais (classificação MTE)
• Matriz de risco 5x5 (severidade x probabilidade)
• 5 categorias GRO: Trivial, Tolerável, Moderado, Substancial, Intolerável
• Controles existentes e recomendados
• Geração automática via SamurAI ou manual

Acesse: Menu > Inventário de Riscos`,
  },
  {
    id: "copsoq",
    title: "COPSOQ-II — Questionário Psicossocial",
    description: "76 questões em 12 dimensões psicossociais",
    icon: <ClipboardCheck className="w-5 h-5" />,
    content: `O COPSOQ-II avalia 12 dimensões psicossociais:

• Exigências Quantitativas e Cognitivas
• Ritmo e Exigências Emocionais
• Influência e Desenvolvimento Profissional
• Significado e Compromisso com o Trabalho
• Previsibilidade e Transparência
• Apoio Social e Comunidade

Os colaboradores respondem por link anônimo (email).
Após 70% de adesão, a análise é gerada automaticamente.`,
  },
  {
    id: "dashboard",
    title: "Dashboard Psicossocial",
    description: "Visualização consolidada dos resultados",
    icon: <BarChart3 className="w-5 h-5" />,
    content: `O Dashboard oferece visão consolidada das avaliações:

• Gráfico radar por dimensão psicossocial
• Segmentação por setor e demografia
• Tendências multi-ciclo (evolução ao longo do tempo)
• Benchmarks setoriais (burnout, assédio, afastamentos)
• Pesquisas de clima: EACT, ITRA, QVT-Walton

Acesse: Menu > Indicadores`,
  },
  {
    id: "documentos",
    title: "Documentos e PDFs",
    description: "20+ documentos com assinatura digital ICP-Brasil",
    icon: <FileText className="w-5 h-5" />,
    content: `A plataforma gera 20+ tipos de PDF com assinatura digital:

• Relatório COPSOQ-II (análise das 12 dimensões)
• Inventário de Riscos (perigos com classificação GRO)
• Plano de Ação (medidas com cronograma)
• PGR Consolidado e Relatório GRO
• PCMSO Integrado (recomendações médicas)
• Laudo Técnico de Riscos Psicossociais
• Certificado de Conformidade NR-01
• Propostas Comerciais
• Relatórios de Clima (EACT, ITRA, QVT)

Todos assinados digitalmente com certificado A1.`,
  },
  {
    id: "certificacoes",
    title: "Assinatura Digital (3 passos)",
    description: "Configure a assinatura ICP-Brasil em 1 minuto",
    icon: <FileCheck className="w-5 h-5" />,
    content: `Para ativar a assinatura digital nos PDFs:

1. Acesse Menu > Certificações > Nova Certificação
2. Arraste seu arquivo .p12 ou .pfx (certificado A1)
3. Informe a senha e clique "Ativar Assinatura Digital"

O sistema extrai automaticamente nome, emissor e validade.
Todos os PDFs passam a ter assinatura ICP-Brasil.
Padrão: adbe.pkcs7.detached (Adobe Reader compatível).

Certificados profissionais (CRP, CREA, CRM) também podem ser cadastrados.`,
  },
  {
    id: "esocial",
    title: "eSocial e Integrações",
    description: "XMLs S-2210, S-2220, S-2240 e integração PGR/PCMSO",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Módulo eSocial para eventos SST:

• S-2210: Comunicação de Acidente de Trabalho (CAT)
• S-2220: Monitoramento da Saúde (ASO)
• S-2240: Condições Ambientais — Agentes Nocivos

Integração PGR/PCMSO: vincule riscos psicossociais aos programas de saúde ocupacional com recomendações médicas e exames ASO.

Acesse: Menu > Exportação eSocial`,
  },
  {
    id: "usuarios",
    title: "Gestão de Usuários e Acessos",
    description: "Convites, perfis e permissões RBAC",
    icon: <Users className="w-5 h-5" />,
    content: `4 perfis de acesso com RBAC granular:

• Admin: Acesso total, gestão de tenants
• Consultor: Empresas, avaliações, propostas, documentos
• Admin da Empresa: Visualiza dados da própria empresa
• Visualizador: Somente leitura

Convide usuários por email com perfil e prazo definidos.
Auditoria registra todas as ações com rastreabilidade LGPD.`,
  },
  {
    id: "suporte",
    title: "Suporte e Canal de Denúncia",
    description: "Chatbot IA, tickets e canal anônimo",
    icon: <HeadphonesIcon className="w-5 h-5" />,
    content: `Canais de suporte disponíveis:

• Suporte IA: Chatbot com base de conhecimento NR-01
• Tickets: Sistema de suporte com acompanhamento
• Canal de Denúncia: Reporte anônimo de assédio/discriminação
  - Colaboradores recebem código para acompanhar
  - Consultores gerenciam no painel dedicado

Acesse: Menu > Suporte IA ou Ajuda`,
  },
];

const faqItems = [
  {
    question: "Como faço login na plataforma?",
    answer:
      "Clique em 'Sign in' e use suas credenciais OAuth (Google, Microsoft) ou email/senha se configurado.",
  },
  {
    question: "Como adiciono uma nova empresa?",
    answer:
      "Vá para Empresas > Nova Empresa > Preencha os dados obrigatórios (nome e CNPJ) > Clique em Criar.",
  },
  {
    question: "Posso editar uma avaliação já criada?",
    answer:
      "Sim! Clique no menu de ações (3 pontos) na avaliação e selecione 'Editar'.",
  },
  {
    question: "Como exporto dados?",
    answer:
      "Cada seção tem um botão de exportação. Escolha o formato (JSON, Excel, Texto) e clique para baixar.",
  },
  {
    question: "Qual é a diferença entre os perfis?",
    answer:
      "Admin: acesso total. Consultor: pode criar/editar avaliações. Visualizador: apenas leitura.",
  },
  {
    question: "Como funciona a auditoria?",
    answer:
      "Todas as ações são registradas com usuário, data, hora e valores alterados. Acesse em Auditoria.",
  },
  {
    question: "Posso usar a plataforma offline?",
    answer:
      "Sim! Instale localmente com XAMPP (Apache + MySQL) e Node.js. Siga o GUIA_INSTALACAO_WINDOWS.md.",
  },
  {
    question: "Como mudo minha senha?",
    answer:
      "Clique no seu perfil (canto superior direito) > Configurações > Alterar Senha.",
  },
  {
    question: "Como configuro a assinatura digital nos PDFs?",
    answer:
      "Acesse Certificações Profissionais > Nova Certificação > Selecione seu arquivo .p12 (Certificado A1 ICP-Brasil) > Informe a senha > Enviar. A partir desse momento, todos os PDFs NR-01 da sua consultoria serão assinados digitalmente com seu certificado.",
  },
  {
    question: "Onde consigo um certificado digital A1?",
    answer:
      "Certificados A1 são emitidos por Autoridades Certificadoras credenciadas pelo ITI, como Serpro, Certisign, Valid, Safeweb, entre outras. Acesse o site da AC de sua preferência e solicite um e-CNPJ A1.",
  },
  {
    question: "Posso instalar a plataforma como aplicativo no computador ou celular?",
    answer:
      "Sim! No Chrome/Edge, acesse a plataforma e clique no ícone de instalação na barra de endereços. No celular Android, toque nos 3 pontos > 'Adicionar à tela inicial'. No iPhone, use Safari > Compartilhar > 'Adicionar à Tela de Início'.",
  },
];

const contactInfo = [
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Email",
    value: "contato@blackbeltconsultoria.com",
    description: "Envie suas dúvidas",
  },
  {
    icon: <Phone className="w-5 h-5" />,
    title: "Telefone",
    value: "+55 (61) 99999-9999",
    description: "Ligue para suporte",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    title: "Chat",
    value: "Chat ao vivo",
    description: "Disponível 9h-18h",
  },
];

export default function Help() {
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadGuide = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/user-guide/download", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao gerar PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Guia_de_Uso_BlackBelt_Platform.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Guia baixado com sucesso!");
    } catch {
      toast.error("Erro ao baixar o guia. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Ajuda e Suporte</h1>
              <p className="text-muted-foreground">
                Guia rápido e recursos para ajudá-lo a usar a plataforma
              </p>
            </div>
          </div>
          <Button onClick={handleDownloadGuide} disabled={downloading} size="lg">
            {downloading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando PDF...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" />Baixar Guia Completo</>
            )}
          </Button>
        </div>

        {/* Download Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-semibold">Guia de Uso Completo — PDF</p>
                <p className="text-sm text-muted-foreground">
                  Manual com 17 seções: SamurAI, COPSOQ-II, avaliações, documentos, assinatura digital e mais.
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleDownloadGuide} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guide">Guia Rápido</TabsTrigger>
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
          </TabsList>

          {/* Guia Rápido */}
          <TabsContent value="guide" className="space-y-4">
            <div className="grid gap-4">
              {guideItems.map(item => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="text-orange-500 mt-1">{item.icon}</div>
                      <div className="flex-1">
                        <CardTitle>{item.title}</CardTitle>
                        <CardDescription>{item.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap text-sm text-muted-foreground font-mono">
                      {item.content}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-4">
            <div className="space-y-2">
              {faqItems.map((item, index) => (
                <Card key={index} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedFaq(
                        expandedFaq === `faq-${index}` ? null : `faq-${index}`
                      )
                    }
                    className="w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center justify-between"
                  >
                    <h3 className="font-semibold">{item.question}</h3>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        expandedFaq === `faq-${index}` ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === `faq-${index}` && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <p className="text-sm text-muted-foreground">
                        {item.answer}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contato */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {contactInfo.map((info, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-orange-500 mb-2">
                      {info.icon}
                      <CardTitle className="text-lg">{info.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-semibold">{info.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {info.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recursos Adicionais */}
            <Card>
              <CardHeader>
                <CardTitle>Recursos Adicionais</CardTitle>
                <CardDescription>
                  Documentação e materiais úteis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    href="https://github.com/CarlosHonorato70/blackbelt-platform"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Documentação Técnica (GitHub)
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    href="https://github.com/CarlosHonorato70/blackbelt-platform/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Issues e Sugestões
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a
                    href="https://github.com/CarlosHonorato70/blackbelt-platform/blob/main/README.md"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    README da Plataforma
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Dicas Úteis */}
            <Card className="bg-orange-50 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-900">
                  💡 Dicas Úteis
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-orange-800 space-y-2">
                <p>
                  • Use o Dashboard como ponto de partida para explorar a
                  plataforma
                </p>
                <p>• Sempre preencha os campos obrigatórios antes de salvar</p>
                <p>• Exporte seus dados regularmente para backup</p>
                <p>• Verifique a Auditoria para rastrear mudanças</p>
                <p>
                  • Use a busca para encontrar rapidamente empresas e avaliações
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
