import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Phase 5: Branding Context
 * 
 * Provides white-label branding configuration throughout the application.
 * Dynamically applies custom colors, logo, favicon for Enterprise customers.
 */

interface BrandingConfig {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  whiteLabelEnabled: boolean;
  customDomain?: string | null;
  customDomainVerified: boolean;
  emailSenderName?: string | null;
  emailSenderEmail?: string | null;
}

const defaultConfig: BrandingConfig = {
  primaryColor: "#3b82f6",
  secondaryColor: "#10b981",
  whiteLabelEnabled: false,
  customDomainVerified: false,
};

const BrandingContext = createContext<BrandingConfig>(defaultConfig);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding, isLoading } = trpc.branding.getBranding.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const [config, setConfig] = useState<BrandingConfig>(defaultConfig);

  useEffect(() => {
    if (branding) {
      const newConfig: BrandingConfig = {
        logoUrl: branding.logoUrl,
        faviconUrl: branding.faviconUrl,
        primaryColor: branding.primaryColor || defaultConfig.primaryColor,
        secondaryColor: branding.secondaryColor || defaultConfig.secondaryColor,
        whiteLabelEnabled: branding.whiteLabelEnabled || false,
        customDomain: branding.customDomain,
        customDomainVerified: branding.customDomainVerified || false,
        emailSenderName: branding.emailSenderName,
        emailSenderEmail: branding.emailSenderEmail,
      };

      setConfig(newConfig);

      // Apply CSS custom properties for dynamic theming
      const root = document.documentElement;
      
      // Convert hex to HSL for Tailwind CSS variables
      const primaryHsl = hexToHsl(newConfig.primaryColor);
      const secondaryHsl = hexToHsl(newConfig.secondaryColor);

      root.style.setProperty("--primary", primaryHsl);
      root.style.setProperty("--secondary", secondaryHsl);

      // Also set as hex for legacy usage
      root.style.setProperty("--primary-hex", newConfig.primaryColor);
      root.style.setProperty("--secondary-hex", newConfig.secondaryColor);

      // Update favicon if custom one is set
      if (newConfig.faviconUrl) {
        updateFavicon(newConfig.faviconUrl);
      }

      // Update page title if white-label is enabled
      if (newConfig.whiteLabelEnabled && newConfig.customDomain) {
        // Could customize title based on domain
        document.title = `Platform - ${newConfig.customDomain}`;
      }
    }
  }, [branding]);

  // Show loading state or return default config while loading
  if (isLoading) {
    return (
      <BrandingContext.Provider value={defaultConfig}>
        {children}
      </BrandingContext.Provider>
    );
  }

  return (
    <BrandingContext.Provider value={config}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
}

/**
 * Convert hex color to HSL format for Tailwind CSS variables
 */
function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return as HSL string (hue deg, saturation %, lightness %)
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Update favicon dynamically
 */
function updateFavicon(url: string) {
  // Find existing favicon link or create new one
  let link = document.querySelector(
    "link[rel*='icon']"
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }

  link.href = url;

  // Also update apple-touch-icon if exists
  const appleIcon = document.querySelector(
    "link[rel='apple-touch-icon']"
  ) as HTMLLinkElement | null;
  if (appleIcon) {
    appleIcon.href = url;
  }
}
