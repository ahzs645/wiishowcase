/**
 * Vite plugin that adds a simple in-memory HTTP signaling relay.
 * Companion POSTs its answer -> Host GETs the answer.
 * Sessions auto-expire after 5 minutes.
 */
export default function signalingPlugin() {
  return {
    name: 'vite-plugin-signaling',
    configureServer(server) {
      // In-memory store: sessionId -> { answer, createdAt }
      const sessions = new Map();

      // Clean up old sessions every 60s
      const cleanup = setInterval(() => {
        const now = Date.now();
        for (const [id, data] of sessions) {
          if (now - data.createdAt > 5 * 60 * 1000) sessions.delete(id);
        }
      }, 60000);
      cleanup.unref(); // Don't keep the process alive
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

        // POST /api/signal/:sessionId -- companion sends answer
        if (req.method === 'POST' && url.pathname.startsWith('/api/signal/')) {
          const sessionId = url.pathname.split('/api/signal/')[1];
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const { answer } = JSON.parse(body);
              sessions.set(sessionId, { answer, createdAt: Date.now() });
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({ ok: true }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // GET /api/signal/:sessionId -- host polls for answer
        if (req.method === 'GET' && url.pathname.startsWith('/api/signal/')) {
          const sessionId = url.pathname.split('/api/signal/')[1];
          const data = sessions.get(sessionId);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          if (data) {
            res.end(JSON.stringify({ answer: data.answer }));
          } else {
            res.end(JSON.stringify({ answer: null }));
          }
          return;
        }

        // CORS preflight for /api/signal
        if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/signal/')) {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        next();
      });
    },
  };
}
