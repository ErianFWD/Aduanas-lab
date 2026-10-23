import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || '',
  production: process.env.NODE_ENV === 'production',
  origins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173').split(',').map(x => x.trim()),
  dbPath: path.resolve(fileURLToPath(new URL('../../', import.meta.url)), process.env.SQLITE_PATH || 'database/aduana_lab3.sqlite'),
  agentKey: process.env.AGENT_API_KEY || '',
  n8n: {url: process.env.N8N_CHAT_URL || '', user: process.env.N8N_CHAT_USER || '', password: process.env.N8N_CHAT_PASSWORD || '', key: process.env.N8N_HEADER_KEY || '', header: process.env.N8N_HEADER_NAME || 'X-Aduana-Key'}
};

export function assertConfiguration() {
  if (config.jwtSecret.length < 32) throw new Error('Falta JWT_SECRET (mínimo 32 caracteres). Ejecuta npm run setup.');
  if (config.agentKey.length < 32) throw new Error('Falta AGENT_API_KEY. Ejecuta npm run setup.');
}
