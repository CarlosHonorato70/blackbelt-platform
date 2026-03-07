import { useEffect } from "react";

interface PageMeta {
  title: string;
  description?: string;
}

const APP_NAME = "Black Belt Consultoria";

/**
 * Hook para definir meta tags dinamicas por pagina (SEO + compartilhamento social).
 * Atualiza document.title e a meta description.
 * Restaura o titulo padrao ao desmontar o componente.
 */
export function usePageMeta({ title, description }: PageMeta) {
  useEffect(() => {
    document.title = `${title} | ${APP_NAME}`;

    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = APP_NAME;
    };
  }, [title, description]);
}
