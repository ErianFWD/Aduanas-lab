import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMovement } from '../backend/src/movements.js';
const valid={tipo:'Traslado',estado_mercancia:'Retenido',referencia:'PRUEBA-001',id_declaracion:1,id_producto:1,cantidad:'2.500',id_bodega_origen:1,id_bodega_destino:2};
test('acepta un traslado con tres decimales y dos bodegas',()=>assert.equal(validateMovement(valid).cantidad,'2.500'));
test('rechaza cantidades inválidas antes de modificar saldos',()=>{for(const quantity of ['-1','0','1.0001','abc','Infinity',null])assert.throws(()=>validateMovement({...valid,cantidad:quantity}));});
test('rechaza un traslado a su misma bodega',()=>assert.throws(()=>validateMovement({...valid,id_bodega_destino:1}),/bodegas/));
test('impide retirar mercancía retenida',()=>assert.throws(()=>validateMovement({...valid,tipo:'Salida',id_bodega_destino:null}),/liberada/));
test('exige referencia estable para prevenir duplicados',()=>assert.throws(()=>validateMovement({...valid,referencia:''}),/referencia/));
