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
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  PanelLeft,
  Users,
  UserSquare2,
  TestTube,
  HelpCircle,
  Clipboard,
  BarChart3,
  Bell,
  DollarSign,
  ShoppingCart,
  ChevronRight,
  Shield,
  Palette,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { CSSProperties, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { TenantSelectionModal } from "./TenantSelectionModal";
import { NotificationCenter } from "./NotificationCenter";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Building2, label: "Empresas", path: "/tenants", adminOnly: true },
  { icon: UserSquare2, label: "Setores", path: "/sectors" },
  { icon: Users, label: "Colaboradores", path: "/people" },
  { icon: FileText, label: "Avaliações NR-01", path: "/risk-assessments" },
  { icon: ClipboardList, label: "Planos de Ação", path: "/action-plans" },
  { icon: Clipboard, label: "COPSOQ-II", path: "/copsoq" },
  { icon: FileText, label: "Histórico", path: "/assessment-history" },
  { icon: FileText, label: "Análise COPSOQ-II", path: "/copsoq/analytics" },
  { icon: Mail, label: "Enviar Convites", path: "/copsoq/invites" },
  { icon: BarChart3, label: "Rastreamento", path: "/copsoq/tracking" },
  { icon: Bell, label: "Lembretes Automáticos", path: "/reminder-management" },
  {
    icon: FileText,
    label: "Relatórios Compliance",
    path: "/compliance-reports",
  },
  { icon: Mail, label: "Convites de Usuários", path: "/user-invites" },
  { icon: DollarSign, label: "Precificação", path: "/pricing-parameters" },
  { icon: ShoppingCart, label: "Serviços", path: "/services" },
  { icon: Building2, label: "Clientes", path: "/clients" },
  { icon: FileText, label: "Propostas", path: "/proposals" },
  {
    icon: Lock,
    label: "Perfis e Permissões",
    path: "/roles-permissions",
    adminOnly: true,
  },
  { icon: Eye, label: "Auditoria", path: "/audit-logs", adminOnly: true },
  {
    icon: Download,
    label: "Exportação LGPD",
    path: "/data-export",
    adminOnly: true,
  },
  {
    icon: TestTube,
    label: "Dashboard de Testes",
    path: "/test-dashboard",
    adminOnly: true,
  },
  {
    icon: Shield,
    label: "Segurança",
    path: "/security-dashboard",
    adminOnly: true,
  },
  {
    icon: Palette,
    label: "Identidade Visual",
    path: "/branding-settings",
    adminOnly: true,
  },
  {
    icon: TrendingUp,
    label: "Dashboard Executivo",
    path: "/executive-dashboard",
  },
  { icon: HelpCircle, label: "Ajuda e Suporte", path: "/help" },
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

        {/* === Tenant Selector === */}
        {!isCollapsed && (
          <div className="px-3 py-2.5 border-b border-sidebar-border">
            <TenantSelectionModal />
          </div>
        )}

        {/* === Navigation Menu === */}
        <SidebarContent className="gap-0">
          <SidebarMenu className="px-2 py-2">
            {menuItems
              .filter(item => !item.adminOnly || user?.role === "admin")
              .map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => navigate(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal rounded-lg ${
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
                      <span className="truncate">{item.label}</span>
                      {isActive && !isCollapsed && (
                        <ChevronRight className="ml-auto h-3 w-3 text-[#c8a55a]/60" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
              <TenantSelectionModal />
              <NotificationCenter />
            </div>
          </div>
        )}

        {/* === Main Content === */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
