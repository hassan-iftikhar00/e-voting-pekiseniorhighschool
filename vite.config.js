import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5000",
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          // Add connection timeout
          proxy.on("error", (err, req, res) => {
            console.error("Proxy error:", err);
            if (res.writeHead) {
              res.writeHead(500, {
                "Content-Type": "application/json",
              });
              res.end(
                JSON.stringify({
                  error: "Proxy error",
                  details: err.message,
                })
              );
            }
          });
          // Return the modified options
          return {
            ...options,
            proxyTimeout: 10000, // 10 second timeout
            timeout: 10000,
          };
        },
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
