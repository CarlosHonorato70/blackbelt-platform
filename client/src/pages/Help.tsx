import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  BookOpen,
  MessageCircle,
  FileText,
  Video,
  Mail,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    id: "dashboard",
    title: "Dashboard",
    description: "Visão geral da plataforma",
    icon: <BookOpen className="w-5 h-5" />,
    content: `O Dashboard é a página inicial da plataforma onde você pode visualizar:

• **KPIs Principais**: Empresas atendidas, colaboradores cadastrados, avaliações NR-01 e programas ativos
• **Serviços Oferecidos**: Cards com descrição dos 4 principais serviços da Black Belt
• **Conformidade NR-01**: Informações sobre a Portaria MTE nº 1.419/2024
• **Filosofia Black Belt**: Dados dos fundadores e metodologia

Use o Dashboard como ponto de partida para navegar pela plataforma.`,
  },
  {
    id: "empresas",
    title: "Gestão de Empresas",
    description: "Cadastre e gerencie empresas clientes",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Na seção Empresas você pode:

• **Listar Empresas**: Visualize todas as empresas cadastradas
• **Criar Nova Empresa**: Clique em "Nova Empresa" e preencha os dados
• **Buscar**: Use o campo de busca para encontrar por nome ou CNPJ
• **Filtrar**: Use o dropdown de status (Ativo, Inativo, Suspenso)
• **Editar/Deletar**: Clique no menu de ações (3 pontos) para editar ou deletar

Campos obrigatórios: Nome da empresa e CNPJ`,
  },
  {
    id: "avaliacoes",
    title: "Avaliações NR-01",
    description: "Crie e gerencie avaliações de riscos",
    icon: <BookOpen className="w-5 h-5" />,
    content: `As Avaliações NR-01 permitem:

• **Listar Avaliações**: Veja todas as avaliações cadastradas
• **Criar Avaliação**: Clique em "Nova Avaliação" para iniciar
• **Preencher Formulário**: Complete todos os campos obrigatórios
• **Definir Riscos**: Selecione fatores de risco e sua probabilidade/gravidade
• **Gerar Plano de Ação**: Crie ações para mitigar riscos identificados
• **Exportar**: Exporte em JSON, Excel ou Texto

Status: Rascunho, Em Andamento, Concluída
Nível de Risco: Baixo, Médio, Alto, Crítico`,
  },
  {
    id: "relatorios",
    title: "Relatórios Compliance",
    description: "Gere relatórios de conformidade",
    icon: <FileText className="w-5 h-5" />,
    content: `Os Relatórios Compliance incluem:

• **Relatórios Automáticos**: Gerados a partir das avaliações NR-01
• **Conformidade Legal**: Verificação com Portaria MTE nº 1.419/2024
• **Recomendações**: Sugestões para melhorias
• **Histórico**: Acompanhe relatórios anteriores
• **Exportar**: Exporte em PDF, Excel ou Word

Use relatórios para apresentar à gestão e órgãos reguladores.`,
  },
  {
    id: "usuarios",
    title: "Convites de Usuários",
    description: "Convide novos usuários para a plataforma",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Para convidar novos usuários:

• **Criar Convite**: Clique em "Novo Convite"
• **Email**: Insira o email do usuário
• **Perfil**: Selecione o perfil (Admin, Consultor, Visualizador)
• **Expiração**: Defina quantos dias o convite é válido
• **Enviar**: O usuário receberá um email com link de aceitação

O convite expira automaticamente após o período definido.`,
  },
  {
    id: "perfis",
    title: "Perfis e Permissões",
    description: "Configure controle de acesso",
    icon: <BookOpen className="w-5 h-5" />,
    content: `Gerencie perfis e permissões:

• **Perfis**: Admin, Consultor, Visualizador, Customizado
• **Permissões**: Defina quem pode fazer o quê
• **Roles**: Associe usuários a perfis
• **Escopo**: Global ou por empresa (tenant)

Exemplo de permissões:
- Admin: Acesso total
- Consultor: Criar/editar avaliações
- Visualizador: Apenas leitura`,
  },
  {
    id: "auditoria",
    title: "Auditoria",
    description: "Acompanhe todas as ações na plataforma",
    icon: <BookOpen className="w-5 h-5" />,
    content: `A Auditoria registra:

• **Quem**: Qual usuário realizou a ação
• **O Quê**: Qual ação foi realizada (criar, editar, deletar)
• **Quando**: Data e hora exata
• **Onde**: Qual recurso foi afetado
• **Valores**: Antes e depois da mudança

Use auditoria para rastreabilidade e conformidade LGPD.`,
  },
  {
    id: "exportacao",
    title: "Exportação LGPD",
    description: "Exporte dados para conformidade LGPD",
    icon: <BookOpen className="w-5 h-5" />,
    content: `A Exportação LGPD permite:

• **Solicitar Dados**: Crie uma solicitação de acesso aos dados
• **Formato**: JSON, CSV ou XML
• **Incluir**: Dados pessoais, histórico, auditoria
• **Download**: Baixe os dados em arquivo compactado
• **Deletar**: Solicite a exclusão de dados (direito ao esquecimento)

Conforme Lei Geral de Proteção de Dados (LGPD).`,
  },
  {
    id: "certificacoes",
    title: "Certificações e Assinatura Digital",
    description: "Gerencie certificados profissionais e configure assinatura digital A1/ICP-Brasil",
    icon: <FileText className="w-5 h-5" />,
    content: `A seção Certificações Profissionais permite gerenciar documentos e ativar assinatura digital:

**Upload de Certificações:**
• **Tipos aceitos**: CRP, CREA, CRM, ISO 45001, ISO 9001, NR, MBA, Especializações e Certificado Digital A1
• **Formatos**: PDF, JPG, PNG, P12/PFX (máx. 10MB)
• **Campos**: Nome, tipo, registro, emissor, validade e observações
• **Alertas**: Notificação automática para certificados vencidos ou a vencer (30 dias)

**Assinatura Digital com Certificado A1 (ICP-Brasil):**
• **Upload do .p12**: Selecione o arquivo .p12 ou .pfx do certificado A1
• **Senha**: Informe a senha do certificado (armazenada com criptografia AES-256-GCM)
• **Validação automática**: A plataforma valida o certificado (senha, chave privada, validade)
• **Extração**: Nome da organização (CN) e data de validade são extraídos automaticamente
• **Ativação**: O certificado é configurado como certificado de assinatura ativa
• **Assinatura automática**: Todos os PDFs NR-01 gerados passam a ser assinados digitalmente

**Como ativar:**
1. Acesse Menu > Certificações Profissionais
2. Clique em "Nova Certificação"
3. Selecione seu arquivo .p12 (certificado A1)
4. Preencha a senha do certificado
5. Clique em "Enviar Certificação"
6. O badge "Assinatura Digital" confirma a ativação

**Padrão da assinatura**: adbe.pkcs7.detached (compatível com Adobe Reader e validadores ICP-Brasil)

**Observações:**
• Cada consultoria pode ter apenas um certificado de assinatura ativo por vez
• Ao enviar um novo .p12, o anterior é desativado automaticamente
• Se a consultoria não tiver certificado A1, os PDFs são assinados com o certificado global da plataforma`,
  },
  {
    id: "precificacao",
    title: "Sistema de Precificação",
    description: "Crie propostas comerciais",
    icon: <BookOpen className="w-5 h-5" />,
    content: `O Sistema de Precificação permite:

• **Clientes**: Cadastre clientes para propostas
• **Serviços**: Defina serviços e valores
• **Propostas**: Crie propostas comerciais
• **Cálculo**: Hora técnica com 4 regimes tributários
• **Desconto**: Aplique descontos e impostos
• **Exportar**: Exporte proposta em PDF

Regimes: MEI, Simples Nacional, Lucro Presumido, Autônomo`,
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Ajuda e Suporte</h1>
            <p className="text-muted-foreground">
              Guia rápido e recursos para ajudá-lo a usar a plataforma Black Belt
            </p>
          </div>
        </div>

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
