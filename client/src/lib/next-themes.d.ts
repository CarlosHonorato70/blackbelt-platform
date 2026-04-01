// Type stub for next-themes (not installed, replace with a no-op)
declare module "next-themes" {
  export interface UseThemeProps {
    themes?: string[];
    forcedTheme?: string;
    setTheme: (theme: string) => void;
    theme?: string;
    resolvedTheme?: string;
    systemTheme?: string;
  }
  export function useTheme(): UseThemeProps;
  export interface ThemeProviderProps {
    children?: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    [key: string]: unknown;
  }
  export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
}
