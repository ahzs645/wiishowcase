import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Vite plugin that serves miicreator's runtime assets (brotli-wasm, etc.)
 * from the installed package, so consumers don't need to copy files manually.
 */
export default function miicreatorPlugin() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.join(__dirname, 'node_modules', 'miicreator', 'public', 'dist');

  return {
    name: 'miicreator-runtime-assets',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const base = server.config.base || '/';
        const prefix = `${base}dist/`;
        if (!req.url?.startsWith(prefix)) return next();

        const fileName = req.url.slice(prefix.length).split('?')[0];
        const filePath = path.join(distDir, fileName);

        if (!fs.existsSync(filePath)) return next();

        const ext = path.extname(fileName);
        const mimeTypes = {
          '.js': 'application/javascript',
          '.wasm': 'application/wasm',
          '.json': 'application/json',
        };

        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        fs.createReadStream(filePath).pipe(res);
      });
    },

    generateBundle() {
      const files = ['brotli-wasm.js', 'brotli_dec_wasm_bg.wasm', 'icons.json'];
      for (const file of files) {
        const filePath = path.join(distDir, file);
        if (!fs.existsSync(filePath)) continue;
        this.emitFile({
          type: 'asset',
          fileName: `dist/${file}`,
          source: fs.readFileSync(filePath),
        });
      }
    },
  };
}
