import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: process.env.JWT_SECRET || '',
  production: process.env.NODE_ENV === 'production',
  origins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:4173,http://terminal.local:4173').split(',').map(x => x.trim()),
  db: {host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), database: process.env.DB_NAME || 'aduana_lab3', user: process.env.DB_USER || 'aduana_app', password: process.env.DB_PASSWORD || '', decimalNumbers: true, dateStrings: true, connectionLimit: 8, multipleStatements: false, timezone: '+00:00'},
  n8n: {url: process.env.N8N_CHAT_URL || '', user: process.env.N8N_CHAT_USER || '', password: process.env.N8N_CHAT_PASSWORD || '', key: process.env.N8N_HEADER_KEY || '', header: process.env.N8N_HEADER_NAME || 'X-Aduana-Key'}
};

export function assertConfiguration() {
  if (config.jwtSecret.length < 32) throw new Error('Falta JWT_SECRET (mínimo 32 caracteres). Ejecuta npm run setup.');
  if (config.db.database !== 'aduana_lab3') throw new Error('Este laboratorio utiliza la base aduana_lab3.');
}
