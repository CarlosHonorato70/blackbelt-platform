/**
 * SUBSCRIPTION FAILURE PAGE
 * 
 * Página mostrada quando o pagamento falha
 */

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function SubscriptionFailure() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-12 px-4 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-3xl">Pagamento Não Processado</CardTitle>
          <CardDescription>
            Não foi possível processar seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <p className="text-sm font-medium">Possíveis causas:</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground mt-2 space-y-1">
              <li>Cartão recusado ou com limite insuficiente</li>
              <li>Informações de pagamento incorretas</li>
              <li>Problema temporário com o processador</li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Não se preocupe, você pode tentar novamente a qualquer momento.</p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={() => navigate("/pricing")}>
              Tentar Novamente
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
