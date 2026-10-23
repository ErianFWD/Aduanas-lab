import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { query } from './db.js';
import { requireAuth, requireRole, publicUser, setSession, clearSession } from './auth.js';
import { createMovement, BusinessError } from './movements.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const reports=JSON.parse(fs.readFileSync(path.join(root,'database/reportes.json'),'utf8'));
export const app=express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({origin:(origin,cb)=>cb(null,!origin||config.origins.includes(origin)),credentials:true}));
app.use(express.json({limit:'16kb'}));
app.use((req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin && !config.origins.includes(req.headers.origin)) return res.status(403).json({error:'Origen de la solicitud no permitido.'});
  if(req.path.startsWith('/api/')) res.set('Cache-Control','no-store');
  next();
});
const loginLimit=rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiados intentos. Espera unos minutos.'}});
const chatLimit=rateLimit({windowMs:60*1000,limit:12,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Espera un momento antes de enviar más preguntas.'}});

app.get('/api/health',async(req,res)=>{
  try {await query('SELECT 1');res.json({status:'ok',database:'conectada'});}
  catch {res.status(503).json({status:'error',database:'sin conexión',error:'No se pudo conectar a MySQL. Revisa backend/.env.'});}
});
const dummyHash=bcrypt.hashSync('invalid-login-placeholder',10);
app.post('/api/auth/login',loginLimit,async(req,res)=>{
  const {correo,password}=req.body||{};
  if(typeof correo!=='string' || typeof password!=='string' || correo.length>120 || password.length>128) return res.status(400).json({error:'Escribe un correo y una contraseña válidos.'});
  const [row]=await query('SELECT * FROM funcionario WHERE correo=?',[correo.trim().toLowerCase()]);
  const valid=await bcrypt.compare(password,row?.password_hash || dummyHash);
  if(!row || !row.activo || !valid) return res.status(401).json({error:'Correo o contraseña incorrectos.'});
  setSession(res,row); res.json({user:publicUser(row)});
});
app.use('/api',requireAuth);
app.get('/api/auth/me',(req,res)=>res.json({user:req.user}));
app.post('/api/auth/logout',async(req,res)=>{
  await query('UPDATE funcionario SET session_version=session_version+1 WHERE id_funcionario=?',[req.user.id]);
  clearSession(res);res.json({ok:true});
});
app.post('/api/auth/password',async(req,res)=>{
  const {actual,nueva}=req.body||{};
  if(typeof actual!=='string'||actual.length>128||typeof nueva!=='string'||nueva.length<12||nueva.length>72||Buffer.byteLength(nueva,'utf8')>72) return res.status(400).json({error:'La nueva contraseña debe tener al menos 12 caracteres y un tamaño máximo de 72 bytes; reduce su longitud si usas caracteres especiales.'});
  const [row]=await query('SELECT password_hash FROM funcionario WHERE id_funcionario=?',[req.user.id]);
  if(!await bcrypt.compare(actual,row.password_hash)) return res.status(400).json({error:'La contraseña actual no es correcta.'});
  const hash=await bcrypt.hash(nueva,12);
  await query('UPDATE funcionario SET password_hash=?,session_version=session_version+1 WHERE id_funcionario=?',[hash,req.user.id]);
  clearSession(res);res.json({ok:true,message:'Contraseña actualizada. Inicia sesión nuevamente.'});
});

app.get('/api/dashboard',async(req,res)=>{
  const [[totals],origins,regimes,months,recent,warehouses]=await Promise.all([
    query(`SELECT (SELECT COUNT(*) FROM declaracion) AS declaraciones,
      (SELECT COUNT(*) FROM inventario WHERE estado='Retenido' AND cantidad>0) AS partidas_retenidas,
      (SELECT COUNT(*) FROM bodega) AS bodegas,
      (SELECT COALESCE(SUM(i.cantidad*dd.valor_declarado/dd.cantidad),0) FROM inventario i JOIN detalle_declaracion dd ON dd.id_declaracion=i.id_declaracion AND dd.id_producto=i.id_producto) AS valor_inventario_usd,
      (SELECT COUNT(*) FROM inspeccion WHERE resultado='Con observaciones') AS inspecciones_observadas`),
    query('SELECT p.nombre,COUNT(*) AS total FROM declaracion d JOIN pais p ON p.id_pais=d.id_pais_origen GROUP BY p.id_pais,p.nombre ORDER BY total DESC,p.nombre LIMIT 5'),
    query('SELECT regimen,COUNT(*) AS total FROM declaracion GROUP BY regimen ORDER BY total DESC,regimen'),
    query("SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes,COUNT(*) AS total FROM declaracion GROUP BY mes ORDER BY mes"),
    query('SELECT m.id_movimiento,m.tipo,m.fecha,m.cantidad,p.descripcion,p.unidad_medida,bo.nombre AS origen,bd.nombre AS destino FROM movimiento m JOIN producto p ON p.id_producto=m.id_producto LEFT JOIN bodega bo ON bo.id_bodega=m.id_bodega_origen LEFT JOIN bodega bd ON bd.id_bodega=m.id_bodega_destino ORDER BY m.fecha DESC,m.id_movimiento DESC LIMIT 5'),
    query('SELECT b.id_bodega,b.nombre,b.capacidad_peso_kg,COALESCE(SUM(i.cantidad*p.peso_unitario_kg),0) AS peso_ocupado_kg FROM bodega b LEFT JOIN inventario i ON i.id_bodega=b.id_bodega LEFT JOIN producto p ON p.id_producto=i.id_producto GROUP BY b.id_bodega,b.nombre,b.capacidad_peso_kg ORDER BY peso_ocupado_kg/b.capacidad_peso_kg DESC LIMIT 4')
  ]);
  res.json({totals,origins,regimes,months,recent,warehouses});
});

function pager(req) {
  const page=Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
  const limit=Math.max(1,Math.min(100,parseInt(req.query.limit,10)||12));
  return {page,limit,offset:(page-1)*limit};
}
async function paginated(req,res,{select,from,where,params,order}) {
  const {page,limit,offset}=pager(req);
  const clause=where.length?' WHERE '+where.join(' AND '):'';
  const [[count],rows]=await Promise.all([
    query('SELECT COUNT(*) AS total '+from+clause,params),
    query(select+' '+from+clause+' ORDER BY '+order+` LIMIT ${limit} OFFSET ${offset}`,params)
  ]);
  res.json({rows,total:count.total,page,limit});
}
function filters(req,searchCols,stateCol) {
  const where=[],params=[];
  const search=String(req.query.search||'').trim().slice(0,120);
  if(search) {where.push('('+searchCols.map(c=>c+' LIKE ?').join(' OR ')+')');params.push(...searchCols.map(()=>'%'+search+'%'));}
  if(stateCol && req.query.estado) {where.push(stateCol+'=?');params.push(String(req.query.estado).slice(0,25));}
  return {where,params};
}
app.get('/api/inventario',async(req,res)=>{
  const f=filters(req,['p.descripcion','p.sku','d.numero','pa.nombre','b.nombre'],'i.estado');
  f.where.push('i.cantidad>0');
  if(req.query.bodega) {f.where.push('i.id_bodega=?');f.params.push(Number(req.query.bodega)||0);}
  await paginated(req,res,{...f,select:'SELECT i.*,p.sku,p.descripcion,p.unidad_medida,p.peso_unitario_kg,b.nombre AS bodega,d.numero AS declaracion,pa.nombre AS pais_origen,ROUND(i.cantidad*dd.valor_declarado/dd.cantidad,2) AS valor_usd',from:'FROM inventario i JOIN producto p ON p.id_producto=i.id_producto JOIN declaracion d ON d.id_declaracion=i.id_declaracion JOIN detalle_declaracion dd ON dd.id_declaracion=i.id_declaracion AND dd.id_producto=i.id_producto JOIN pais pa ON pa.id_pais=d.id_pais_origen JOIN bodega b ON b.id_bodega=i.id_bodega',order:'i.fecha_ingreso DESC,i.id_inventario DESC'});
});
app.get('/api/declaraciones',async(req,res)=>{
  const f=filters(req,['d.numero','im.razon_social','pa.nombre'],'d.estado');
  await paginated(req,res,{...f,select:'SELECT d.*,im.razon_social,pa.nombre AS pais_origen,(SELECT SUM(dd.valor_declarado) FROM detalle_declaracion dd WHERE dd.id_declaracion=d.id_declaracion) AS valor_usd',from:'FROM declaracion d JOIN importador im ON im.id_importador=d.id_importador JOIN pais pa ON pa.id_pais=d.id_pais_origen',order:'d.fecha DESC,d.id_declaracion DESC'});
});
app.get('/api/declaraciones/:id',async(req,res)=>{
  const [declaration]=await query('SELECT d.*,im.razon_social,pa.nombre AS pais_origen,a.nombre AS agente FROM declaracion d JOIN importador im ON im.id_importador=d.id_importador JOIN pais pa ON pa.id_pais=d.id_pais_origen JOIN agente_aduanal a ON a.id_agente=d.id_agente WHERE d.id_declaracion=?',[req.params.id]);
  if(!declaration) return res.status(404).json({error:'Declaración no encontrada.'});
  const [details,containers,inspections]=await Promise.all([
    query('SELECT dd.*,p.sku,p.descripcion,p.unidad_medida FROM detalle_declaracion dd JOIN producto p ON p.id_producto=dd.id_producto WHERE dd.id_declaracion=?',[req.params.id]),
    query('SELECT numero,tipo,peso_bruto_kg FROM contenedor WHERE id_declaracion=?',[req.params.id]),
    query('SELECT i.*,f.nombre AS funcionario FROM inspeccion i JOIN v_funcionario_publico f ON f.id_funcionario=i.id_funcionario WHERE id_declaracion=? ORDER BY fecha DESC',[req.params.id])
  ]);res.json({declaration,details,containers,inspections});
});
app.get('/api/bodegas',async(req,res)=>res.json({rows:await query(`SELECT b.*,COUNT(DISTINCT i.id_producto) AS productos,
  COALESCE(SUM(i.cantidad*p.peso_unitario_kg),0) AS peso_ocupado_kg,
  COALESCE(SUM(CASE WHEN i.estado='Retenido' AND i.cantidad>0 THEN 1 ELSE 0 END),0) AS partidas_retenidas
  FROM bodega b LEFT JOIN inventario i ON i.id_bodega=b.id_bodega AND i.cantidad>0 LEFT JOIN producto p ON p.id_producto=i.id_producto
  GROUP BY b.id_bodega,b.nombre,b.ubicacion,b.capacidad_peso_kg ORDER BY b.id_bodega`)}));
app.get('/api/movimientos',async(req,res)=>{
  const f=filters(req,['m.referencia','p.descripcion','d.numero'],'m.tipo');
  await paginated(req,res,{...f,select:'SELECT m.*,p.descripcion,p.unidad_medida,d.numero AS declaracion,bo.nombre AS origen,bd.nombre AS destino,f.nombre AS funcionario',from:'FROM movimiento m JOIN producto p ON p.id_producto=m.id_producto JOIN declaracion d ON d.id_declaracion=m.id_declaracion LEFT JOIN bodega bo ON bo.id_bodega=m.id_bodega_origen LEFT JOIN bodega bd ON bd.id_bodega=m.id_bodega_destino JOIN v_funcionario_publico f ON f.id_funcionario=m.id_funcionario',order:'m.fecha DESC,m.id_movimiento DESC'});
});
app.post('/api/movimientos',requireRole('admin','operador'),async(req,res)=>{
  const result=await createMovement(req.body,req.user);res.status(result.duplicado?200:201).json(result);
});
app.get('/api/inspecciones',async(req,res)=>{
  const f=filters(req,['d.numero','f.nombre','ins.observaciones'],'ins.resultado');
  await paginated(req,res,{...f,select:'SELECT ins.*,d.numero AS declaracion,f.nombre AS funcionario',from:'FROM inspeccion ins JOIN declaracion d ON d.id_declaracion=ins.id_declaracion JOIN v_funcionario_publico f ON f.id_funcionario=ins.id_funcionario',order:'ins.fecha DESC,ins.id_inspeccion DESC'});
});
app.get('/api/catalogos',async(req,res)=>{
  const [bodegas,partidas]=await Promise.all([
    query('SELECT id_bodega,nombre FROM bodega ORDER BY id_bodega'),
    query(`SELECT dd.id_declaracion,dd.id_producto,d.numero,p.sku,p.descripcion,p.unidad_medida,dd.cantidad,
      dd.cantidad-COALESCE((SELECT SUM(m.cantidad) FROM movimiento m WHERE m.id_declaracion=dd.id_declaracion AND m.id_producto=dd.id_producto AND m.tipo='Entrada'),0) AS pendiente_ingreso
      FROM detalle_declaracion dd JOIN declaracion d ON d.id_declaracion=dd.id_declaracion JOIN producto p ON p.id_producto=dd.id_producto ORDER BY d.numero,p.sku`)
  ]);res.json({bodegas,partidas});
});
app.get('/api/usuarios',requireRole('admin'),async(req,res)=>res.json({rows:await query('SELECT id_funcionario,nombre,cargo,correo,rol,activo,id_supervisor FROM funcionario ORDER BY id_funcionario')}));
app.get('/api/reportes',(req,res)=>res.json({rows:reports.map(({id,titulo,sql})=>({id,titulo,sql}))}));
app.get('/api/reportes/:id',async(req,res)=>{
  const report=reports.find(r=>r.id===Number(req.params.id));
  if(!report)return res.status(404).json({error:'Reporte no encontrado.'});
  res.json({...report,rows:await query(report.sql)});
});
app.get('/api/asistente/estado',(req,res)=>res.json({configurado:Boolean(config.n8n.url),memoria:'Por conversación; la proporciona n8n.'}));
app.post('/api/asistente',chatLimit,async(req,res)=>{
  if(!config.n8n.url) return res.status(503).json({error:'La conexión con n8n está pendiente. Configura N8N_CHAT_URL en backend/.env.'});
  const {mensaje,sesion}=req.body||{};
  if(typeof mensaje!=='string'||!mensaje.trim()||mensaje.length>1200||typeof sesion!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(sesion))return res.status(400).json({error:'Escribe una pregunta válida (máximo 1200 caracteres).'});
  try{
    const headers={'Content-Type':'application/json'};
    if(config.n8n.user && config.n8n.password) headers.Authorization='Basic '+Buffer.from(config.n8n.user+':'+config.n8n.password).toString('base64');
    if(config.n8n.key) headers[config.n8n.header]=config.n8n.key;
    const response=await fetch(config.n8n.url,{method:'POST',headers,body:JSON.stringify({chatInput:mensaje.trim(),sessionId:`user-${req.user.id}-${sesion}`,action:'sendMessage'}),signal:AbortSignal.timeout(60000)});
    if(!response.ok)throw new Error('n8n rechazó la consulta.');
    const data=await response.json();
    const result=Array.isArray(data)?data[0]:data;
    const output=result.output ?? result.text ?? result.response;
    if(typeof output!=='string')throw new Error('n8n no devolvió una respuesta de texto.');
    res.json({respuesta:output});
  }catch(err){res.status(502).json({error:err.name==='TimeoutError'?'El agente tardó demasiado. Intenta nuevamente.':'No fue posible consultar el agente. Revisa la ejecución y credenciales en n8n.'});}
});

const dist=path.join(root,'frontend/dist');
if(fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*path}',(req,res,next)=>req.path.startsWith('/api/')?next():res.sendFile(path.join(dist,'index.html')));
}
app.use((req,res)=>res.status(404).json({error:'Ruta no encontrada.'}));
app.use((err,req,res,next)=>{
  if(err instanceof BusinessError)return res.status(err.status).json({error:err.message});
  if(err.type==='entity.parse.failed')return res.status(400).json({error:'El cuerpo JSON no es válido.'});
  if(err.type==='entity.too.large')return res.status(413).json({error:'La solicitud es demasiado grande.'});
  console.error('Error de API:',err.code || err.name);
  res.status(500).json({error:'No se pudo completar la operación. Verifica la conexión con la base de datos.'});
});
