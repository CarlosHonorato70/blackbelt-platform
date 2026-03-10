import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Eye, X } from "lucide-react";
import { Button } from "./ui/button";

export function ImpersonationBanner() {
  const { impersonating, stopImpersonation, isImpersonating } = useImpersonation();

  if (!isImpersonating || !impersonating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3 shadow-md">
      <Eye className="h-4 w-4" />
      <span className="text-sm font-medium">
        Visualizando como: <strong>{impersonating.name}</strong>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-7 bg-amber-600 border-amber-700 text-white hover:bg-amber-700 text-xs"
        onClick={stopImpersonation}
      >
        <X className="h-3 w-3 mr-1" />
        Sair da impersonacao
      </Button>
    </div>
  );
}
