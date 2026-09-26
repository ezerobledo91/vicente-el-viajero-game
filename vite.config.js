import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas para que el build funcione abierto desde cualquier carpeta o hosting estático.
  base: "./",
  server: { port: 5173, open: true },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1.5 MB; es esperado.
  },
});
