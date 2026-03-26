// vite.config.ts
import { defineConfig } from "file:///C:/Users/Carlos%20Honorato/OneDrive/%C3%81rea%20de%20trabalho/blackbelt-platform-main/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.33/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Carlos%20Honorato/OneDrive/%C3%81rea%20de%20trabalho/blackbelt-platform-main/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@20.19.33_/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/Carlos%20Honorato/OneDrive/%C3%81rea%20de%20trabalho/blackbelt-platform-main/node_modules/.pnpm/tailwindcss@3.4.19_tsx@4.21.0/node_modules/tailwindcss/lib/index.js";
import autoprefixer from "file:///C:/Users/Carlos%20Honorato/OneDrive/%C3%81rea%20de%20trabalho/blackbelt-platform-main/node_modules/.pnpm/autoprefixer@10.4.24_postcss@8.5.6/node_modules/autoprefixer/lib/autoprefixer.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Carlos Honorato\\OneDrive\\\xC1rea de trabalho\\blackbelt-platform-main";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./client/src"),
      "@shared": path.resolve(__vite_injected_original_dirname, "./shared")
    }
  },
  root: path.resolve(__vite_injected_original_dirname, "client"),
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          config: path.resolve(__vite_injected_original_dirname, "tailwind.config.ts")
        }),
        autoprefixer()
      ]
    }
  },
  build: {
    outDir: path.resolve(__vite_injected_original_dirname, "dist/public"),
    emptyOutDir: true
  },
  ssr: {
    external: [
      "pdfkit",
      "dotenv/config",
      "@babel/preset-typescript",
      "@babel/core",
      "drizzle-orm",
      "postgres"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDYXJsb3MgSG9ub3JhdG9cXFxcT25lRHJpdmVcXFxcXHUwMEMxcmVhIGRlIHRyYWJhbGhvXFxcXGJsYWNrYmVsdC1wbGF0Zm9ybS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxDYXJsb3MgSG9ub3JhdG9cXFxcT25lRHJpdmVcXFxcXHUwMEMxcmVhIGRlIHRyYWJhbGhvXFxcXGJsYWNrYmVsdC1wbGF0Zm9ybS1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9DYXJsb3MlMjBIb25vcmF0by9PbmVEcml2ZS8lQzMlODFyZWElMjBkZSUyMHRyYWJhbGhvL2JsYWNrYmVsdC1wbGF0Zm9ybS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcInRhaWx3aW5kY3NzXCI7XHJcbmltcG9ydCBhdXRvcHJlZml4ZXIgZnJvbSBcImF1dG9wcmVmaXhlclwiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9jbGllbnQvc3JjXCIpLFxyXG4gICAgICBcIkBzaGFyZWRcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NoYXJlZFwiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICByb290OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcImNsaWVudFwiKSxcclxuICBjc3M6IHtcclxuICAgIHBvc3Rjc3M6IHtcclxuICAgICAgcGx1Z2luczogW1xyXG4gICAgICAgIHRhaWx3aW5kY3NzKHtcclxuICAgICAgICAgIGNvbmZpZzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJ0YWlsd2luZC5jb25maWcudHNcIiksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgYXV0b3ByZWZpeGVyKCksXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIG91dERpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJkaXN0L3B1YmxpY1wiKSxcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gIH0sXHJcbiAgc3NyOiB7XHJcbiAgICBleHRlcm5hbDogW1xyXG4gICAgICBcInBkZmtpdFwiLFxyXG4gICAgICBcImRvdGVudi9jb25maWdcIixcclxuICAgICAgXCJAYmFiZWwvcHJlc2V0LXR5cGVzY3JpcHRcIixcclxuICAgICAgXCJAYmFiZWwvY29yZVwiLFxyXG4gICAgICBcImRyaXp6bGUtb3JtXCIsXHJcbiAgICAgIFwicG9zdGdyZXNcIixcclxuICAgIF0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBdWEsU0FBUyxvQkFBb0I7QUFDcGMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8saUJBQWlCO0FBQ3hCLE9BQU8sa0JBQWtCO0FBQ3pCLE9BQU8sVUFBVTtBQUpqQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsY0FBYztBQUFBLE1BQzNDLFdBQVcsS0FBSyxRQUFRLGtDQUFXLFVBQVU7QUFBQSxJQUMvQztBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU0sS0FBSyxRQUFRLGtDQUFXLFFBQVE7QUFBQSxFQUN0QyxLQUFLO0FBQUEsSUFDSCxTQUFTO0FBQUEsTUFDUCxTQUFTO0FBQUEsUUFDUCxZQUFZO0FBQUEsVUFDVixRQUFRLEtBQUssUUFBUSxrQ0FBVyxvQkFBb0I7QUFBQSxRQUN0RCxDQUFDO0FBQUEsUUFDRCxhQUFhO0FBQUEsTUFDZjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRLEtBQUssUUFBUSxrQ0FBVyxhQUFhO0FBQUEsSUFDN0MsYUFBYTtBQUFBLEVBQ2Y7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILFVBQVU7QUFBQSxNQUNSO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
