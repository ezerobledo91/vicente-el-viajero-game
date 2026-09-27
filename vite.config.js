import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

const AJUSTES = path.resolve("public/assets/ajustes.json");

// Editor de tramos (?editor): el juego guarda los ajustes con un POST a /__ajustes y este plugin
// los escribe en public/assets/ajustes.json. Solo existe en el servidor de desarrollo.
const guardarAjustes = {
  name: "guardar-ajustes",
  configureServer(server) {
    server.middlewares.use("/__ajustes", (req, res) => {
      if (req.method !== "POST") return res.writeHead(405).end();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          fs.writeFileSync(AJUSTES, JSON.stringify(JSON.parse(body), null, 2) + "\n");
          res.writeHead(200).end("ok");
        } catch (e) {
          res.writeHead(400).end(String(e));
        }
      });
    });
  },
};

export default defineConfig({
  // Rutas relativas para que el build funcione abierto desde cualquier carpeta o hosting estático.
  base: "./",
  plugins: [guardarAjustes],
  // Guardar los ajustes no tiene que recargar la página mientras se edita.
  server: { port: 5173, open: true, watch: { ignored: ["**/public/assets/ajustes.json"] } },
  build: {
    chunkSizeWarningLimit: 2000, // Phaser pesa ~1.5 MB; es esperado.
  },
});
