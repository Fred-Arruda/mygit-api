import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3000;

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'repos.json');

const store = new Store(DATA_FILE);
const app = createApp(store);

const server = app.listen(PORT, () => {
  console.log(`mygit-api rodando em http://localhost:${PORT}`);
  console.log(`dados em ${DATA_FILE}`);
});

function shutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
}


process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));