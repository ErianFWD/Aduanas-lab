import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const filename=fileURLToPath(new URL('../backend/.env',import.meta.url));
let text=fs.existsSync(filename)?fs.readFileSync(filename,'utf8'):fs.readFileSync(new URL('../backend/.env.example',import.meta.url),'utf8');
for(const name of ['JWT_SECRET','AGENT_API_KEY']) {
  const regex=new RegExp('^'+name+'=.*$','m');
  if(!regex.test(text)) text+='\n'+name+'='+crypto.randomBytes(48).toString('hex')+'\n';
  else if(new RegExp('^'+name+'=[ \t]*$','m').test(text)) text=text.replace(regex,name+'='+crypto.randomBytes(48).toString('hex'));
}
fs.writeFileSync(filename,text,{mode:0o600});
const {initializeDatabase}=await import('../backend/src/db.js');
initializeDatabase();
const {pool}=await import('../backend/src/db.js');await pool.end();
console.log('Configuración lista. SQLite se creó si no existía. No se borraron datos. Ejecuta npm run dev.');
