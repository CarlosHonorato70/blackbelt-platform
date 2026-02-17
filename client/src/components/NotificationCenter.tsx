import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Avaliação Completa",
      message: "A avaliação 'Setor Administrativo' foi concluída com sucesso",
      type: "success",
      timestamp: "2 minutos atrás",
      read: false,
      actionUrl: "/risk-assessments",
    },
    {
      id: "2",
      title: "Convite Aceito",
      message: "João Silva aceitou o convite para colaborar na plataforma",
      type: "info",
      timestamp: "15 minutos atrás",
      read: false,
      actionUrl: "/people",
    },
    {
      id: "3",
      title: "Solicitação DSR Processada",
      message: "A solicitação de exportação de dados foi processada",
      type: "success",
      timestamp: "1 hora atrás",
      read: true,
      actionUrl: "/data-export",
    },
    {
      id: "4",
      title: "Relatório Disponível",
      message: "O relatório de compliance NR-01 está pronto para download",
      type: "info",
      timestamp: "3 horas atrás",
      read: true,
      actionUrl: "/compliance-reports",
    },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "info":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-l-4 border-green-600";
      case "error":
        return "bg-red-50 border-l-4 border-red-600";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-600";
      case "info":
        return "bg-blue-50 border-l-4 border-blue-600";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96 overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Marcar como lido
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 p-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg space-y-1 cursor-pointer transition-colors hover:bg-gray-100 ${getNotificationColor(
                    notification.type
                  )} ${!notification.read ? "opacity-100" : "opacity-75"}`}
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notification.timestamp}
                  </p>
                </div>
              ))}
            </div>

            <DropdownMenuSeparator />

            <div className="flex gap-2 p-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar Tudo
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
