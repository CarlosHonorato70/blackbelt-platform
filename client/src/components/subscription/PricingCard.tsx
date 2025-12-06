/**
 * PRICING CARD COMPONENT
 * 
 * Card para exibir um plano de assinatura individual
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface PricingCardProps {
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

export function PricingCard({
  name,
  displayName,
  description,
  monthlyPrice,
  yearlyPrice,
  billingCycle,
  features,
  isPopular = false,
  isCurrentPlan = false,
  onSelect,
  disabled = false,
}: PricingCardProps) {
  const price = billingCycle === "monthly" ? monthlyPrice : yearlyPrice;
  const priceFormatted = (price / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const monthlyEquivalent = billingCycle === "yearly" ? price / 12 / 100 : null;

  return (
    <Card className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            Mais Popular
          </Badge>
        </div>
      )}
      
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <Badge variant="secondary">
            Plano Atual
          </Badge>
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-2xl">{displayName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{priceFormatted}</span>
            <span className="text-muted-foreground">
              /{billingCycle === "monthly" ? "mês" : "ano"}
            </span>
          </div>
          {monthlyEquivalent && (
            <p className="text-sm text-muted-foreground mt-1">
              {monthlyEquivalent.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}/mês no plano anual
            </p>
          )}
        </div>

        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button 
          className="w-full" 
          onClick={onSelect}
          disabled={disabled || isCurrentPlan}
          variant={isPopular ? "default" : "outline"}
        >
          {isCurrentPlan ? "Plano Atual" : "Selecionar Plano"}
        </Button>
      </CardFooter>
    </Card>
  );
}
