// Crea su propia instancia desechable. Nunca ejecuta pruebas sobre backend/.env.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=process.env.MYSQL_BASEDIR;
if(!base){console.error('Define MYSQL_BASEDIR con la carpeta de instalación de MySQL. Esta prueba crea y borra únicamente una instancia temporal propia.');process.exit(1);}
const binary=path.join(base,'bin',process.platform==='win32'?'mysqld.exe':'mysqld');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'aduana-test-'));
const results=[];
let dbProcess,admin,httpServer,pool;
async function check(name,fn){try{await fn();results.push({prueba:name,resultado:'OK'});console.log('OK · '+name);}catch(error){results.push({prueba:name,resultado:'ERROR',detalle:error.message});throw error;}}
try{
 const portServer=net.createServer();await new Promise(r=>portServer.listen(0,'127.0.0.1',r));const dbPort=portServer.address().port;await new Promise(r=>portServer.close(r));
 const common=['--no-defaults',...(process.platform==='win32'?[]:['--user='+os.userInfo().username]),'--basedir='+base,'--datadir='+path.join(temp,'data')];
 const log=fs.openSync(path.join(temp,'mysql.log'),'a');
 const init=spawn(binary,[...common,'--initialize-insecure'],{stdio:['ignore',log,log]});
 if((await once(init,'exit'))[0]!==0)throw new Error('MySQL no pudo inicializarse. '+fs.readFileSync(path.join(temp,'mysql.log'),'utf8').slice(-2000));
 dbProcess=spawn(binary,[...common,'--socket=','--port='+dbPort,'--bind-address=127.0.0.1','--mysqlx=0'],{stdio:['ignore',log,log]});
 for(let attempt=0;attempt<80;attempt++){try{admin=await mysql.createConnection({host:'127.0.0.1',port:dbPort,user:'root',multipleStatements:true,decimalNumbers:true,dateStrings:true});break;}catch{if(dbProcess.exitCode!==null)break;await new Promise(r=>setTimeout(r,250));}}
 if(!admin)throw new Error('MySQL no inició. '+fs.readFileSync(path.join(temp,'mysql.log'),'utf8').slice(-2000));
 await check('Script SQL completo: creación, datos y ocho consultas',async()=>{await admin.query(fs.readFileSync(path.join(root,'database/Aduana_Lab3.sql'),'utf8'));});
 await check('13 tablas con al menos 15 registros cada una',async()=>{const counts=JSON.parse(fs.readFileSync(path.join(root,'docs/conteos_esperados.json'),'utf8'));assert.equal(Object.keys(counts).length,13);for(const [name,expected] of Object.entries(counts)){const [[r]]=await admin.query('SELECT COUNT(*) AS total FROM aduana_lab3.'+mysql.escapeId(name));assert.equal(r.total,expected);assert.ok(r.total>=15);}});
 await check('Rechazo de llaves foráneas inexistentes y cantidades negativas',async()=>{await assert.rejects(admin.query("INSERT INTO aduana_lab3.producto (sku,descripcion,valor_referencia,peso_unitario_kg,id_partida) VALUES ('INVALIDO','Prueba',1,1,999)"),e=>e.code==='ER_NO_REFERENCED_ROW_2');await assert.rejects(admin.query('UPDATE aduana_lab3.inventario SET cantidad=-1 WHERE id_inventario=1'),e=>e.code==='ER_CHECK_CONSTRAINT_VIOLATED');});
 await check('Saldo de inventario conciliado contra todos los movimientos',async()=>{
  const [rows]=await admin.query(`SELECT i.id_inventario FROM aduana_lab3.inventario i LEFT JOIN
   (SELECT id_declaracion,id_producto,bodega,estado_mercancia,SUM(delta) AS saldo FROM
    (SELECT id_declaracion,id_producto,id_bodega_destino AS bodega,estado_mercancia,cantidad AS delta FROM aduana_lab3.movimiento WHERE id_bodega_destino IS NOT NULL
     UNION ALL SELECT id_declaracion,id_producto,id_bodega_origen,estado_mercancia,-cantidad FROM aduana_lab3.movimiento WHERE id_bodega_origen IS NOT NULL) u
    GROUP BY id_declaracion,id_producto,bodega,estado_mercancia) m
   ON m.id_declaracion=i.id_declaracion AND m.id_producto=i.id_producto AND m.bodega=i.id_bodega AND m.estado_mercancia=i.estado
   WHERE ABS(i.cantidad-COALESCE(m.saldo,0))>0.0001`);assert.equal(rows.length,0);
 });
 await check('Fechas de inspección posteriores o iguales a sus declaraciones',async()=>{const [[r]]=await admin.query('SELECT COUNT(*) AS total FROM aduana_lab3.inspeccion i JOIN aduana_lab3.declaracion d ON d.id_declaracion=i.id_declaracion WHERE DATE(i.fecha)<d.fecha');assert.equal(r.total,0);});
 const appPassword=crypto.randomBytes(25).toString('hex'),readerPassword=crypto.randomBytes(25).toString('hex');
 const business=['pais','importador','agente_aduanal','partida_arancelaria','producto','declaracion','detalle_declaracion','contenedor','bodega','inventario','movimiento','inspeccion','v_funcionario_publico'];
 for(const [name,password] of [['aduana_test_app',appPassword],['aduana_test_lector',readerPassword]])await admin.query('CREATE USER '+mysql.escape(name)+"@'%' IDENTIFIED BY "+mysql.escape(password));
 for(const t of [...business,'funcionario'])await admin.query('GRANT SELECT ON aduana_lab3.'+mysql.escapeId(t)+" TO 'aduana_test_app'@'%'");
 await admin.query("GRANT UPDATE (password_hash,session_version) ON aduana_lab3.funcionario TO 'aduana_test_app'@'%'");
 await admin.query("GRANT INSERT,UPDATE ON aduana_lab3.inventario TO 'aduana_test_app'@'%'");
 await admin.query("GRANT INSERT ON aduana_lab3.movimiento TO 'aduana_test_app'@'%'");
 await admin.query("GRANT LOCK TABLES ON aduana_lab3.* TO 'aduana_test_app'@'%'");
 for(const t of business)await admin.query('GRANT SELECT ON aduana_lab3.'+mysql.escapeId(t)+" TO 'aduana_test_lector'@'%'");
 await check('Usuario n8n: permite SELECT y rechaza escritura y lectura de contraseñas',async()=>{const c=await mysql.createConnection({host:'127.0.0.1',port:dbPort,user:'aduana_test_lector',password:readerPassword,database:'aduana_lab3'});try{assert.ok((await c.query('SELECT * FROM inventario LIMIT 1'))[0].length);await assert.rejects(c.query('DELETE FROM inventario WHERE id_inventario=-1'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');await assert.rejects(c.query('SELECT password_hash FROM funcionario'),e=>e.code==='ER_TABLEACCESS_DENIED_ERROR');assert.ok((await c.query('SELECT * FROM v_funcionario_publico'))[0].length);}finally{await c.end();}});
 Object.assign(process.env,{PORT:'0',JWT_SECRET:crypto.randomBytes(48).toString('hex'),DB_HOST:'127.0.0.1',DB_PORT:String(dbPort),DB_NAME:'aduana_lab3',DB_USER:'aduana_test_app',DB_PASSWORD:appPassword,NODE_ENV:'test',N8N_CHAT_URL:''});
 const {app}=await import('../backend/src/app.js');pool=(await import('../backend/src/db.js')).pool;
 httpServer=app.listen(0,'127.0.0.1');await once(httpServer,'listening');const url='http://127.0.0.1:'+httpServer.address().port;
 async function request(route,{cookie,body,...options}={}){const r=await fetch(url+'/api'+route,{...options,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')};}
 async function login(correo){const r=await request('/auth/login',{method:'POST',body:{correo,password:'Aduana2026!'}});assert.equal(r.status,200);assert.match(r.cookie,/HttpOnly/);return r.cookie.split(';')[0];}
 await check('API privada: rechaza solicitudes sin sesión y credenciales incorrectas',async()=>{assert.equal((await request('/inventario')).status,401);assert.equal((await request('/auth/login',{method:'POST',body:{correo:'admin@aduana.local',password:'incorrecta'}})).status,401);});
 let adminCookie,operatorCookie,readerCookie;
 await check('Login real para administración, operación y consulta',async()=>{adminCookie=await login('admin@aduana.local');operatorCookie=await login('operador@aduana.local');readerCookie=await login('consulta@aduana.local');});
 await check('Permisos de rol: consulta no registra movimientos ni ve usuarios',async()=>{assert.equal((await request('/usuarios',{cookie:readerCookie})).status,403);assert.equal((await request('/movimientos',{cookie:readerCookie,method:'POST',body:{}})).status,403);assert.equal((await request('/usuarios',{cookie:adminCookie})).status,200);});
 await check('Todas las pantallas reciben datos de MySQL',async()=>{for(const route of ['/dashboard','/inventario','/declaraciones','/declaraciones/1','/bodegas','/movimientos','/inspecciones','/catalogos','/reportes','/auth/me']){const r=await request(route,{cookie:adminCookie});assert.equal(r.status,200,route+' '+JSON.stringify(r.data));assert.ok(r.data);}});
 await check('Ocho reportes ejecutables con resultados reales',async()=>{for(let id=1;id<=8;id++){const r=await request('/reportes/'+id,{cookie:readerCookie});assert.equal(r.status,200);assert.ok(r.data.rows.length>0);fs.mkdirSync(path.join(root,'evidencias/resultados_sql'),{recursive:true});fs.writeFileSync(path.join(root,`evidencias/resultados_sql/reporte_${id}.json`),JSON.stringify(r.data,null,2));}});
 await check('Filtros parametrizados y paginación',async()=>{const r=await request('/inventario?search=China&estado=Retenido&limit=3',{cookie:adminCookie});assert.equal(r.status,200);assert.ok(r.data.rows.every(x=>x.pais_origen==='China'&&x.estado==='Retenido'));assert.ok(r.data.rows.length<=3);const injection=await request('/inventario?search='+encodeURIComponent("' OR 1=1 --"),{cookie:adminCookie});assert.equal(injection.status,200);assert.equal(injection.data.rows.length,0);});
 const movement={referencia:'TEST-TRANSFER-001',tipo:'Traslado',id_declaracion:1,id_producto:1,id_bodega_origen:1,id_bodega_destino:2,cantidad:'2.500',estado_mercancia:'Retenido',observaciones:'Prueba de integración'};
 await check('Movimiento válido modifica origen, destino e historial',async()=>{const [[before]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:movement});assert.equal(r.status,201,JSON.stringify(r.data));const [[after]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');assert.equal(Number(after.cantidad),Number(before.cantidad)-2.5);});
 await check('Reintento duplicado no duplica existencias ni movimientos',async()=>{const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:movement});assert.equal(r.status,200);assert.equal(r.data.duplicado,true);const [[count]]=await admin.query("SELECT COUNT(*) AS total FROM aduana_lab3.movimiento WHERE referencia='TEST-TRANSFER-001'");assert.equal(count.total,1);});
 await check('Reutilizar referencia con otro contenido devuelve conflicto',async()=>{const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...movement,cantidad:'3.000'}});assert.equal(r.status,409);});
 await check('Cantidad excesiva falla y conserva el saldo anterior',async()=>{const [[before]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...movement,referencia:'TEST-INVALID-001',cantidad:'999999999.999'}});assert.equal(r.status,422);const [[after]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');assert.equal(after.cantidad,before.cantidad);});
 await check('Ingreso parcial válido y rechazo de sobreingreso',async()=>{const entry={...movement,referencia:'TEST-ENTRY-0001',tipo:'Entrada',id_declaracion:4,id_producto:4,id_bodega_origen:null,id_bodega_destino:4,cantidad:'5.000'};assert.equal((await request('/movimientos',{method:'POST',cookie:operatorCookie,body:entry})).status,201);assert.equal((await request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...entry,referencia:'TEST-ENTRY-0002',cantidad:'30.000'}})).status,422);});
 await check('Rollback completo si la bodega destino no existe',async()=>{const [[before]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...movement,referencia:'TEST-ROLLBACK-001',id_bodega_destino:999}});assert.equal(r.status,422);const [[after]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');assert.equal(after.cantidad,before.cantidad);});
 await check('Dos traslados concurrentes no retiran más que el stock disponible',async()=>{const responses=await Promise.all([1,2].map(n=>request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...movement,referencia:'TEST-CONCURRENT-'+n,cantidad:'80.000'}})));assert.deepEqual(responses.map(r=>r.status).sort(),[201,422]);const [[stock]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');assert.ok(Number(stock.cantidad)>=0);});
 await check('Capacidad insuficiente revierte el movimiento completo',async()=>{await admin.query('UPDATE aduana_lab3.bodega SET capacidad_peso_kg=1 WHERE id_bodega=15');const [[before]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');const r=await request('/movimientos',{method:'POST',cookie:operatorCookie,body:{...movement,referencia:'TEST-CAPACITY-001',id_bodega_destino:15,cantidad:'1.000'}});assert.equal(r.status,422);const [[after]]=await admin.query('SELECT cantidad FROM aduana_lab3.inventario WHERE id_declaracion=1 AND id_producto=1 AND id_bodega=1');assert.equal(after.cantidad,before.cantidad);});
 await check('Asistente sin configuración informa que n8n está pendiente',async()=>{const r=await request('/asistente',{method:'POST',cookie:readerCookie,body:{mensaje:'Hola',sesion:'prueba'}});assert.equal(r.status,503);});
 await check('Logout revoca el token anterior en el servidor',async()=>{assert.equal((await request('/auth/logout',{method:'POST',cookie:adminCookie,body:{}})).status,200);assert.equal((await request('/auth/me',{cookie:adminCookie})).status,401);});
 await check('Cambio de contraseña invalida sesiones y acepta la nueva clave',async()=>{const r=await request('/auth/password',{method:'POST',cookie:readerCookie,body:{actual:'Aduana2026!',nueva:'NuevaClaveSegura2026!'}});assert.equal(r.status,200);assert.equal((await request('/auth/me',{cookie:readerCookie})).status,401);const fresh=await request('/auth/login',{method:'POST',body:{correo:'consulta@aduana.local',password:'NuevaClaveSegura2026!'}});assert.equal(fresh.status,200);});
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 if(httpServer)await new Promise(r=>httpServer.close(r));if(pool)await pool.end();if(admin)await admin.end();if(dbProcess&&dbProcess.exitCode===null){dbProcess.kill('SIGTERM');await once(dbProcess,'exit');}
 fs.mkdirSync(path.join(root,'docs'),{recursive:true});
 fs.writeFileSync(path.join(root,'docs/03_Validacion_tecnica.json'),JSON.stringify({fecha:new Date().toISOString(),motor:'MySQL 8.4.13 · instancia temporal propia',pruebas:results,agente_llm_verificado:false},null,2));
 fs.rmSync(temp,{recursive:true,force:true});
 console.log(`${results.filter(x=>x.resultado==='OK').length}/${results.length} pruebas correctas. El agente LLM requiere credenciales del usuario.`);
}
