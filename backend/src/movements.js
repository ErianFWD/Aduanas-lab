import { pool } from './db.js';

export class BusinessError extends Error {
  constructor(message, status=422) { super(message); this.status=status; }
}
const positiveId = x => Number.isSafeInteger(Number(x)) && Number(x)>0;
export function validateMovement(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BusinessError('Datos del movimiento inválidos.');
  const {tipo,estado_mercancia,referencia} = body;
  if (!['Entrada','Salida','Traslado'].includes(tipo)) throw new BusinessError('Tipo de movimiento inválido.');
  if (!['Retenido','Liberado'].includes(estado_mercancia)) throw new BusinessError('Estado de mercancía inválido.');
  if (typeof referencia !== 'string' || !/^[a-zA-Z0-9_-]{8,50}$/.test(referencia)) throw new BusinessError('La referencia debe tener entre 8 y 50 letras, números o guiones.');
  if (!positiveId(body.id_declaracion) || !positiveId(body.id_producto)) throw new BusinessError('Selecciona una partida válida.');
  const quantity=String(body.cantidad ?? '');
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(quantity) || Number(quantity)<=0) throw new BusinessError('La cantidad debe ser positiva y tener máximo tres decimales.');
  const from = body.id_bodega_origen ? Number(body.id_bodega_origen) : null;
  const to = body.id_bodega_destino ? Number(body.id_bodega_destino) : null;
  if ((from!==null && !positiveId(from)) || (to!==null && !positiveId(to))) throw new BusinessError('Bodega inválida.');
  if ((tipo==='Entrada' && (from!==null || to===null)) || (tipo==='Salida' && (from===null || to!==null)) || (tipo==='Traslado' && (from===null || to===null || from===to))) throw new BusinessError('Revisa las bodegas de origen y destino.');
  if (tipo==='Salida' && estado_mercancia!=='Liberado') throw new BusinessError('Solo puedes retirar mercancía liberada.');
  if (body.observaciones != null && (typeof body.observaciones!=='string' || body.observaciones.length>250)) throw new BusinessError('Las observaciones admiten hasta 250 caracteres.');
  return {referencia,tipo,estado_mercancia,id_declaracion:Number(body.id_declaracion),id_producto:Number(body.id_producto),cantidad:quantity,from,to,observaciones:body.observaciones || null};
}
const signature = m => JSON.stringify([m.tipo,m.id_declaracion,m.id_producto,Number(m.cantidad),m.from ?? m.id_bodega_origen ?? null,m.to ?? m.id_bodega_destino ?? null,m.estado_mercancia,m.observaciones || null]);

export async function createMovement(body,user) {
  const m=validateMovement(body);
  const c=await pool.getConnection();
  try {
    await c.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await c.beginTransaction();
    // Una misma partida se bloquea antes de leer saldos. Evita sobreingresos y retiros concurrentes.
    const [[detail]]=await c.execute('SELECT cantidad FROM detalle_declaracion WHERE id_declaracion=? AND id_producto=? FOR UPDATE',[m.id_declaracion,m.id_producto]);
    if (!detail) throw new BusinessError('La partida no existe.');
    const [[prior]]=await c.execute('SELECT * FROM movimiento WHERE referencia=?',[m.referencia]);
    if (prior) {
      if (signature(prior)!==signature(m) || prior.id_funcionario!==user.id) throw new BusinessError('La referencia ya identifica otro movimiento.',409);
      await c.commit(); return {id:prior.id_movimiento,duplicado:true};
    }
    const warehouseIds=[m.from,m.to].filter(Boolean).sort((a,b)=>a-b);
    const [lockedWarehouses]=await c.execute('SELECT id_bodega,capacidad_peso_kg FROM bodega WHERE id_bodega IN ('+warehouseIds.map(()=>'?').join(',')+') ORDER BY id_bodega FOR UPDATE',warehouseIds);
    if(lockedWarehouses.length!==warehouseIds.length) throw new BusinessError('Una de las bodegas no existe.');
    if(m.tipo==='Entrada') {
      const [[declaration]]=await c.execute('SELECT estado FROM declaracion WHERE id_declaracion=?',[m.id_declaracion]);
      if(m.estado_mercancia==='Liberado' && declaration.estado!=='Liberada') throw new BusinessError('La declaración debe estar liberada para ingresar mercancía con ese estado.');
    }
    if(m.from) {
      const [update]=await c.execute('UPDATE inventario SET cantidad=cantidad-? WHERE id_declaracion=? AND id_producto=? AND id_bodega=? AND estado=? AND cantidad>=?', [m.cantidad,m.id_declaracion,m.id_producto,m.from,m.estado_mercancia,m.cantidad]);
      if(update.affectedRows!==1) throw new BusinessError('No hay existencias suficientes con ese origen y estado.');
    }
    if(m.to) {
      const warehouse=lockedWarehouses.find(b=>b.id_bodega===m.to);
      const [[weight]]=await c.execute('SELECT COALESCE(SUM(i.cantidad*p.peso_unitario_kg),0) AS total FROM inventario i JOIN producto p ON p.id_producto=i.id_producto WHERE i.id_bodega=?',[m.to]);
      const [[product]]=await c.execute('SELECT peso_unitario_kg FROM producto WHERE id_producto=?',[m.id_producto]);
      if(Number(weight.total)+Number(m.cantidad)*Number(product.peso_unitario_kg)>Number(warehouse.capacidad_peso_kg)) throw new BusinessError('El movimiento supera la capacidad de la bodega destino.');
      if(m.tipo==='Entrada') {
        const [[received]]=await c.execute("SELECT COALESCE(SUM(cantidad),0) AS total FROM movimiento WHERE id_declaracion=? AND id_producto=? AND tipo='Entrada'",[m.id_declaracion,m.id_producto]);
        if(Number(received.total)+Number(m.cantidad)>Number(detail.cantidad)+0.0000001) throw new BusinessError('El ingreso supera la cantidad declarada pendiente de recibir.');
      }
      await c.execute('INSERT INTO inventario (id_declaracion,id_producto,id_bodega,cantidad,fecha_ingreso,estado) VALUES (?,?,?,?,CURRENT_DATE,?) ON DUPLICATE KEY UPDATE cantidad=cantidad+?', [m.id_declaracion,m.id_producto,m.to,m.cantidad,m.estado_mercancia,m.cantidad]);
    }
    const [insert]=await c.execute('INSERT INTO movimiento (referencia,tipo,cantidad,id_declaracion,id_producto,id_bodega_origen,id_bodega_destino,estado_mercancia,id_funcionario,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?)',[m.referencia,m.tipo,m.cantidad,m.id_declaracion,m.id_producto,m.from,m.to,m.estado_mercancia,user.id,m.observaciones]);
    await c.commit(); return {id:insert.insertId,duplicado:false};
  } catch(err) {
    await c.rollback();
    if(err.code==='ER_DUP_ENTRY') throw new BusinessError('La referencia ya existe. Consulta los movimientos antes de reintentar.',409);
    if(err.code==='ER_NO_REFERENCED_ROW_2') throw new BusinessError('Uno de los registros relacionados no existe.');
    if(err.code==='ER_LOCK_DEADLOCK' || err.code==='ER_LOCK_WAIT_TIMEOUT') throw new BusinessError('Otra operación está actualizando esta partida. Reintenta con la misma referencia.',409);
    throw err;
  } finally {c.release();}
}
