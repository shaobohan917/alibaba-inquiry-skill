import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.API_HOST ?? '127.0.0.1',
  port: Number.parseInt(process.env.API_PORT ?? '3001', 10),
  dbPath: process.env.DB_PATH ?? path.join(backendRoot, 'data', 'ali-ai-agent-system.sqlite'),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:1420,tauri://localhost,http://tauri.localhost',
};
