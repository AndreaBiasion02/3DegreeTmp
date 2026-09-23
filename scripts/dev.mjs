import http from 'node:http';
import next from 'next';
import { serveCoasterApi } from '../server/node-api.mjs';

const port = Number(process.env.PORT || 8001);
const app = next({ dev: true, hostname: '127.0.0.1', port });
await app.prepare();
const handle = app.getRequestHandler();
http.createServer(async (req, res) => {
  if (await serveCoasterApi(req, res)) return;
  await handle(req, res);
}).listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
