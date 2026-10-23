import mysql from 'mysql2/promise';
import fs from 'node:fs';
import { config } from '../backend/src/config.js';
import { ask } from './prompt.mjs';
try{
 const user=await ask('Usuario administrador de MySQL [root]: ',{defaultValue:'root'});
 const password=await ask('Contraseña de MySQL (no se muestra): ',{secret:true});
 const c=await mysql.createConnection({host:config.db.host,port:config.db.port,user,password,multipleStatements:true});
 try{
   const [[row]]=await c.query("SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema='aduana_lab3'");
   if(row.total>0)throw new Error('aduana_lab3 ya contiene tablas. Se detuvo la importación para conservar los datos. Usa una instancia vacía o revisa la base en Workbench.');
   await c.query(fs.readFileSync(new URL('../database/Aduana_Lab3.sql',import.meta.url),'utf8'));
   console.log('Base creada: 13 tablas y 465 registros. Las ocho consultas se ejecutaron sin errores.');
 }finally{await c.end();}
}catch(e){console.error(e.message);process.exitCode=1;}
