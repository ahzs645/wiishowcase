import { createSignalingMiddleware } from "./server/signaling.mjs";
/** The same bounded, expiring signaling service in development and preview. */
export default function signalingPlugin() {
  const attach = (server) => {
    server.middlewares.use(createSignalingMiddleware());
  };
  return {
    name: "vite-plugin-signaling",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
