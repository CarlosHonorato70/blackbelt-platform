/**
 * SUBSCRIPTION SUCCESS PAGE
 * 
 * Página de confirmação após assinatura bem-sucedida
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function SubscriptionSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // Opcional: pode fazer uma chamada para verificar o status
  }, []);

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl">Assinatura Confirmada!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg text-center">
            <p className="font-medium">🎉 Bem-vindo à Black Belt Platform!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Seu período de teste gratuito começou agora
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="font-semibold">Próximos Passos:</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Configure sua primeira empresa</li>
              <li>Convide membros da equipe</li>
              <li>Comece sua primeira avaliação de risco</li>
              <li>Explore os relatórios e recursos</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={() => navigate("/dashboard")}>
              Ir para Dashboard
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/subscription/dashboard")}>
              Ver Assinatura
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
