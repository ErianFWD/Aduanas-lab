import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const path=fileURLToPath(new URL('../backend/.env',import.meta.url));
if(fs.existsSync(path)){console.log('backend/.env ya existe. Se conservó tu configuración.');process.exit(0);}
let text=fs.readFileSync(new URL('../backend/.env.example',import.meta.url),'utf8');
text=text.replace('JWT_SECRET=','JWT_SECRET='+crypto.randomBytes(48).toString('hex')).replace('DB_PASSWORD=','DB_PASSWORD='+crypto.randomBytes(24).toString('hex'));
text+='\n# Cuenta exclusiva de solo lectura para n8n. No compartir este archivo.\nN8N_DB_USER=aduana_lector\nN8N_DB_PASSWORD='+crypto.randomBytes(24).toString('hex')+'\nDB_ACCOUNT_HOST=localhost\n';
fs.writeFileSync(path,text,{mode:0o600});
console.log('backend/.env creado con claves aleatorias. Revisa DB_HOST y DB_PORT antes de importar.');
