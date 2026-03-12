import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to download a base64-encoded PDF returned by a tRPC mutation.
 * Usage:
 *   const { exportPdf, isExporting } = usePdfExport();
 *   <Button onClick={() => exportPdf(() => trpc.nr01Pdf.exportXxx.mutate({ tenantId }))} disabled={isExporting}>
 */
export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportPdf = useCallback(
    async (mutationFn: () => Promise<{ filename: string; data: string }>) => {
      setIsExporting(true);
      try {
        const result = await mutationFn();
        // Decode base64 and download
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "PDF exportado com sucesso!" });
      } catch (err: any) {
        toast({
          title: "Erro ao exportar PDF",
          description: err?.message || "Tente novamente",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [toast]
  );

  return { exportPdf, isExporting };
}
