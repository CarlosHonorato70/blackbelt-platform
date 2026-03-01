import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Small delay so the animation is visible on first render
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem(STORAGE_KEY, level);
    setVisible(false);
  }

  // Don't render anything if consent was already given
  if (localStorage.getItem(STORAGE_KEY)) return null;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 transition-transform duration-500 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
              Utilizamos cookies para melhorar sua experiência, analisar o
              tráfego do site e personalizar conteúdo. Ao continuar navegando,
              você concorda com nossa{" "}
              <Link
                to="/privacy"
                className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
              >
                Política de Privacidade
              </Link>
              .
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => accept("essential")}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors dark:border-gray-600"
              >
                Apenas Essenciais
              </button>
              <button
                onClick={() => accept("all")}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Aceitar Todos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
