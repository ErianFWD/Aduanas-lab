import mysql from 'mysql2/promise';
import { config } from '../backend/src/config.js';
import { ask } from './prompt.mjs';
const business=['pais','importador','agente_aduanal','partida_arancelaria','producto','declaracion','detalle_declaracion','contenedor','bodega','inventario','movimiento','inspeccion','v_funcionario_publico'];
try{
 const user=await ask('Usuario administrador de MySQL [root]: ',{defaultValue:'root'}),password=await ask('Contraseña de MySQL (no se muestra): ',{secret:true});
 const appUser=config.db.user,appPassword=config.db.password,reader=process.env.N8N_DB_USER||'aduana_lector',readerPassword=process.env.N8N_DB_PASSWORD||'',host=process.env.DB_ACCOUNT_HOST||'localhost';
 if([appUser,reader].some(s=>!/^aduana_[a-zA-Z0-9_]+$/.test(s))||appUser===reader)throw new Error('Usa dos cuentas diferentes con prefijo aduana_.');
 if(!['localhost','127.0.0.1','%'].includes(host))throw new Error('DB_ACCOUNT_HOST debe ser localhost, 127.0.0.1 o %.');
 if(appPassword.length<16||readerPassword.length<16)throw new Error('Ejecuta npm run setup o establece contraseñas diferentes de al menos 16 caracteres.');
 const c=await mysql.createConnection({host:config.db.host,port:config.db.port,user,password});
 const account=(name)=>mysql.escape(name)+'@'+mysql.escape(host);
 try{
   const [[exists]]=await c.query('SELECT COUNT(*) AS total FROM mysql.user WHERE User IN (?,?) AND Host=?',[appUser,reader,host]);
   if(exists.total>0)throw new Error('Una cuenta ya existe. Se conservó sin alterar sus permisos. Revisa sus credenciales en MySQL antes de continuar.');
   for(const [name,pass] of [[appUser,appPassword],[reader,readerPassword]])await c.query('CREATE USER '+account(name)+' IDENTIFIED BY '+mysql.escape(pass));
   for(const table of [...business,'funcionario'])await c.query('GRANT SELECT ON aduana_lab3.'+mysql.escapeId(table)+' TO '+account(appUser));
   await c.query('GRANT UPDATE (password_hash,session_version) ON aduana_lab3.funcionario TO '+account(appUser));
   await c.query('GRANT INSERT, UPDATE ON aduana_lab3.inventario TO '+account(appUser));
   await c.query('GRANT INSERT ON aduana_lab3.movimiento TO '+account(appUser));
   await c.query('GRANT LOCK TABLES ON aduana_lab3.* TO '+account(appUser));
   for(const table of business)await c.query('GRANT SELECT ON aduana_lab3.'+mysql.escapeId(table)+' TO '+account(reader));
   console.log('Cuentas creadas: aplicación y agente de solo lectura. Las contraseñas están en tu backend/.env local.');
 }finally{await c.end();}
}catch(e){console.error(e.message);process.exitCode=1;}
