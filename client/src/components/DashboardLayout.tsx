import { useAuth } from "@/_core/hooks/useAuth.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Building2,
  Eye,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  PanelLeft,
  Users,
  HelpCircle,
  Clipboard,
  Bell,
  ShoppingCart,
  ChevronRight,
  Palette,
  TrendingUp,
  ClipboardList,
  CreditCard,
  Brain,
  Target,
  Calendar,
  CheckSquare,
  Award,
  Megaphone,
  GraduationCap,
  Ruler,
  Upload,
  HeartPulse,
  MessageSquareWarning,
  Headphones,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { CSSProperties, Fragment, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { TenantSelectionModal } from "./TenantSelectionModal";
import { NotificationCenter } from "./NotificationCenter";
import { CompanySelector } from "./CompanySelector";
import { Button } from "./ui/button";

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  adminOnly?: boolean;
  consultantOnly?: boolean; // Visível apenas para consultores (e admin)
  companyVisible?: boolean; // Visível para empresas clientes
  group?: string;
};

const menuItems: MenuItem[] = [
  // --- Principal ---
  { icon: LayoutDashboard, label: "Dashboard", path: "/home", group: "Principal", companyVisible: true },
  { icon: Brain, label: "SamurAI", path: "/agent", group: "Principal", consultantOnly: true },
  { icon: Building2, label: "Minhas Empresas", path: "/companies", consultantOnly: true, group: "Principal" },
  { icon: Users, label: "Colaboradores", path: "/people", group: "Principal", companyVisible: true },
  { icon: TrendingUp, label: "Dashboard Executivo", path: "/executive-dashboard", group: "Principal", companyVisible: true },

  // --- Documentos NR-01 (consultor revisa/edita, exporta PDF) ---
  { icon: FileText, label: "Propostas Comerciais", path: "/proposals", group: "Documentos NR-01", consultantOnly: true },
  { icon: Clipboard, label: "Relatório COPSOQ-II", path: "/copsoq/analytics", group: "Documentos NR-01", companyVisible: true },
  { icon: Eye, label: "Respostas COPSOQ", path: "/copsoq/tracking", group: "Documentos NR-01", companyVisible: true },
  { icon: Target, label: "Inventário de Riscos", path: "/risk-assessments", group: "Documentos NR-01", companyVisible: true },
  { icon: ClipboardList, label: "Plano de Ação", path: "/action-plans", group: "Documentos NR-01", companyVisible: true },
  { icon: GraduationCap, label: "Programa de Treinamento", path: "/training", group: "Documentos NR-01", companyVisible: true },
  { icon: HeartPulse, label: "Integração PGR+PCMSO", path: "/pgr-pcmso", group: "Documentos NR-01", consultantOnly: true },
  { icon: Award, label: "Certificado NR-01", path: "/compliance-certificate", group: "Documentos NR-01", companyVisible: true },

  // --- Acompanhamento ---
  { icon: Calendar, label: "Cronograma NR-01", path: "/compliance-timeline", group: "Acompanhamento", companyVisible: true },
  { icon: CheckSquare, label: "Checklist Conformidade", path: "/compliance-checklist", group: "Acompanhamento", companyVisible: true },
  { icon: Bell, label: "Alertas e Prazos", path: "/deadline-alerts", group: "Acompanhamento", companyVisible: true },
  { icon: Brain, label: "Indicadores", path: "/psychosocial-dashboard", group: "Acompanhamento", companyVisible: true },

  // --- Ferramentas ---
  { icon: Megaphone, label: "Pesquisa de Clima", path: "/climate-surveys", group: "Ferramentas", companyVisible: true },
  { icon: MessageSquareWarning, label: "Canal de Denúncia", path: "/anonymous-report", group: "Ferramentas", companyVisible: true },
  { icon: ShieldAlert, label: "Gestão de Denúncias", path: "/complaints", group: "Ferramentas", consultantOnly: true },
  { icon: Ruler, label: "Avaliação Ergonômica", path: "/ergonomic-assessments", group: "Ferramentas", companyVisible: true },
  { icon: Upload, label: "Exportação eSocial", path: "/esocial-export", group: "Ferramentas", consultantOnly: true },

  // --- Comercial (somente consultor) ---
  { icon: ShoppingCart, label: "Serviços e Preços", path: "/services", group: "Comercial", consultantOnly: true },
  // Clientes removido — gestão unificada via Empresas
  { icon: Mail, label: "Convites", path: "/user-invites", group: "Comercial", consultantOnly: true },

  // --- Administração (somente admin master) ---
  { icon: Building2, label: "Tenants", path: "/tenants", adminOnly: true, group: "Administração" },
  { icon: Lock, label: "Perfis e Permissões", path: "/roles-permissions", adminOnly: true, group: "Administração" },
  { icon: Eye, label: "Auditoria e Segurança", path: "/audit-logs", adminOnly: true, group: "Administração" },
  { icon: CreditCard, label: "Assinaturas", path: "/admin/subscriptions", adminOnly: true, group: "Administração" },
  { icon: Palette, label: "Identidade Visual", path: "/branding-settings", adminOnly: true, group: "Administração" },

  // --- Suporte ---
  { icon: Headphones, label: "Suporte IA", path: "/support-chat", group: "Suporte", companyVisible: true },
  { icon: HelpCircle, label: "Ajuda", path: "/help", group: "Suporte", companyVisible: true },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0f1a2e] to-[#1e3a5f]">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-xl object-cover shadow-lg ring-2 ring-[#c8a55a]/30"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{APP_TITLE}</h1>
              <p className="text-sm text-slate-400">
                Acesse sua conta para continuar
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full bg-[#c8a55a] hover:bg-[#b8953a] text-[#0f1a2e] font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Entrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { pathname: location } = useLocation();
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  // Detectar tipo do tenant para controle de sidebar
  const { data: tenantInfo } = trpc.companies.getMyTenantInfo.useQuery(undefined, {
    retry: false,
    enabled: !!user && user.role !== "admin",
  });
  const isAdmin = user?.role === "admin";
  const tenantInfoLoaded = tenantInfo !== undefined;
  const isCompanyUser = tenantInfoLoaded ? tenantInfo?.tenantType === "company" : !isAdmin;
  const isConsultant = isAdmin || (tenantInfoLoaded && tenantInfo?.tenantType === "consultant");

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r-0"
        disableTransition={isResizing}
      >
        {/* === Sidebar Header: Logo + Title === */}
        <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
          <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
            {isCollapsed ? (
              <div className="relative h-8 w-8 shrink-0 group">
                <img
                  src={APP_LOGO}
                  className="h-8 w-8 rounded-md object-cover ring-1 ring-[#c8a55a]/30"
                  alt="Logo"
                />
                <button
                  onClick={toggleSidebar}
                  className="absolute inset-0 flex items-center justify-center bg-sidebar-accent rounded-md ring-1 ring-sidebar-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-md object-cover ring-1 ring-[#c8a55a]/30 shrink-0"
                    alt="Logo"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold tracking-tight truncate text-sidebar-foreground text-sm">
                      Black Belt
                    </span>
                    <span className="text-[10px] text-[#c8a55a] font-medium tracking-widest uppercase">
                      Consultoria
                    </span>
                  </div>
                </div>
                <button
                  onClick={toggleSidebar}
                  className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                >
                  <PanelLeft className="h-4 w-4 text-sidebar-foreground/60" />
                </button>
              </>
            )}
          </div>
        </SidebarHeader>

        {/* === Tenant Selector (Admin only) === */}
        {!isCollapsed && isAdmin && (
          <div className="px-3 py-2.5 border-b border-sidebar-border">
            <TenantSelectionModal />
          </div>
        )}

        {/* === Company Selector (Consultants) === */}
        {!isCollapsed && isConsultant && !isAdmin && (
          <div className="px-3 py-2.5 border-b border-sidebar-border">
            <CompanySelector />
          </div>
        )}

        {/* === Navigation Menu === */}
        <SidebarContent className="gap-0">
          <SidebarMenu className="px-2 py-1">
            {(() => {
              const filtered = menuItems.filter(item => {
                // Admin vê tudo
                if (isAdmin) return true;
                // Items adminOnly: só admin vê
                if (item.adminOnly) return false;
                // Empresa: vê apenas items com companyVisible
                if (isCompanyUser) return item.companyVisible === true;
                // Consultor: vê tudo exceto adminOnly (já filtrado acima)
                // Items consultantOnly: visíveis para consultor
                return true;
              });
              let lastGroup = "";
              return filtered.map(item => {
                const isActive = location === item.path;
                const showGroup = item.group && item.group !== lastGroup;
                if (item.group) lastGroup = item.group;
                return (
                  <Fragment key={item.path}>
                    {showGroup && !isCollapsed && (
                      <li className="px-3 pt-4 pb-1 list-none">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                          {item.group}
                        </span>
                      </li>
                    )}
                    {showGroup && isCollapsed && (
                      <li className="my-1 mx-2 border-t border-sidebar-border/30 list-none" />
                    )}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => navigate(item.path)}
                        tooltip={item.label}
                        className={`h-9 transition-all font-normal rounded-lg ${
                          isActive
                            ? "bg-sidebar-accent text-[#c8a55a] font-medium border-l-2 border-l-[#c8a55a]"
                            : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 shrink-0 ${
                            isActive ? "text-[#c8a55a]" : ""
                          }`}
                        />
                        <span className="truncate text-[13px]">{item.label}</span>
                        {isActive && !isCollapsed && (
                          <ChevronRight className="ml-auto h-3 w-3 text-[#c8a55a]/60" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </Fragment>
                );
              });
            })()}
          </SidebarMenu>
        </SidebarContent>

        {/* === User Footer === */}
        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9 shrink-0 ring-2 ring-[#c8a55a]/30">
                  <AvatarFallback className="text-xs font-bold bg-[#c8a55a]/20 text-[#c8a55a]">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-none text-sidebar-foreground">
                    {user?.name || "-"}
                  </p>
                  <p className="text-xs text-sidebar-foreground/50 truncate mt-1.5">
                    {user?.email || "-"}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>

        {/* === Resize Handle (inside Sidebar so it doesn't break peer layout) === */}
        {!isCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[#c8a55a]/30 transition-colors z-50"
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </Sidebar>

      <SidebarInset>
        {/* === Mobile Header === */}
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground font-medium">
                    {activeMenuItem?.label ?? APP_TITLE}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 max-w-xs ml-4 flex items-center gap-2">
              {(isAdmin || isConsultant) && <TenantSelectionModal />}
              <NotificationCenter />
            </div>
          </div>
        )}

        {/* === Email Verification Banner === */}
        <EmailVerificationBanner />

        {/* === Main Content === */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: () => {
      alert("Email de verificação reenviado com sucesso!");
    },
    onError: () => {
      alert("Erro ao reenviar email. Tente novamente.");
    },
  });

  // Don't show if user is verified, dismissed, or not logged in
  if (!user || (user as any).emailVerified || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2 text-amber-800">
        <Mail className="h-4 w-4 shrink-0" />
        <span>
          Verifique seu email para garantir acesso completo à plataforma.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => resendMutation.mutate()}
          disabled={resendMutation.isPending}
          className="text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2 text-xs"
        >
          {resendMutation.isPending ? "Enviando..." : "Reenviar email"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-500 hover:text-amber-700 text-lg leading-none px-1"
          aria-label="Fechar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
