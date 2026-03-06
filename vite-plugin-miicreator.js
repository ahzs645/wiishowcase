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

  function listDistFiles(dir) {
    if (!fs.existsSync(dir)) return [];

    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...listDistFiles(entryPath));
        continue;
      }
      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
    return files;
  }

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
      for (const filePath of listDistFiles(distDir)) {
        const relativePath = path.relative(distDir, filePath);
        this.emitFile({
          type: 'asset',
          fileName: `dist/${relativePath}`,
          source: fs.readFileSync(filePath),
        });
      }
    },
  };
}
