export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "your-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "mongodb://localhost:27017/blackbelt",
  isProduction: process.env.NODE_ENV === "production",
  appTitle: process.env.VITE_APP_TITLE ?? "Black Belt Consultoria",
  appLogo: process.env.VITE_APP_LOGO ?? "/logo.png",
};

