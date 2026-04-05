import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Eye, X } from "lucide-react";
import { Button } from "./ui/button";

export function ImpersonationBanner() {
  const { impersonating, stopImpersonation, isImpersonating } = useImpersonation();

  if (!isImpersonating || !impersonating) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] bg-amber-500 text-amber-950 px-4 py-1.5 flex items-center gap-2 shadow-lg rounded-full text-xs">
      <Eye className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="font-medium whitespace-nowrap">
        <strong>{impersonating.name}</strong>
      </span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-2 bg-amber-600 border-amber-700 text-white hover:bg-amber-700 text-xs rounded-full"
        onClick={stopImpersonation}
      >
        <X className="h-3 w-3 mr-0.5" />
        Sair
      </Button>
    </div>
  );
}
