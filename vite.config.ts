import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.resolve(__dirname, "tailwind.config.ts"),
        }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  ssr: {
    external: [
      "pdfkit",
      "dotenv/config",
      "@babel/preset-typescript",
      "@babel/core",
      "drizzle-orm",
      "postgres",
    ],
  },
});
