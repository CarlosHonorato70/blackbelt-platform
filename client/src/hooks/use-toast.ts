import { useState, useCallback } from "react";

export function useToast() {
  const [messages, setMessages] = useState<any[]>([]);

  const toast = useCallback((options: any) => {
    const message = {
      id: Date.now(),
      title: options.title || "",
      description: options.description || "",
      variant: options.variant || "default",
    };

    console.log("Toast:", message);
    setMessages((prev) => [...prev, message]);
  }, []);

  return { toast, messages };
}
