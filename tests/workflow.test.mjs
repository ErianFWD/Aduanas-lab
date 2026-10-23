import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const workflow=JSON.parse(fs.readFileSync(new URL('../n8n/Agente_Aduana_Lab3.json',import.meta.url),'utf8'));
const queryExpression=workflow.nodes.find(n=>n.name==='Consultar_inventario').parameters.query.slice(3,-2).trim();
function sql(value){return vm.runInNewContext(queryExpression,{$fromAI:()=>value});}
test('workflow permanece inactivo y sin credenciales incrustadas',()=>{assert.equal(workflow.active,false);assert.ok(workflow.nodes.every(n=>!n.credentials));});
test('herramienta acepta SELECT y limita resultados con una consulta exterior',()=>{const q=sql('SELECT sku FROM producto');assert.equal(q,'SELECT * FROM (SELECT sku FROM producto LIMIT 100) AS consulta_aduana LIMIT 100');});
test('herramienta rechaza escritura, consultas múltiples y tabla privada',()=>{for(const q of ['DELETE FROM inventario','SELECT 1; DROP TABLE producto','SELECT password_hash FROM funcionario','SELECT SLEEP(20)','SELECT * FROM mysql.user /*comentario*/'])assert.throws(()=>sql(q));});
test('fixture distingue entrada válida, duplicado dentro del lote e inválido',()=>{const f=JSON.parse(fs.readFileSync(new URL('../n8n/Prueba_Entradas_Lab3.json',import.meta.url),'utf8'));const events=vm.runInNewContext('(function(){'+f.nodes.find(n=>n.name==='Tres eventos').parameters.jsCode+'})()');const output=vm.runInNewContext('(function(){'+f.nodes.find(n=>n.name==='Verificar entradas').parameters.jsCode+'})()',{$input:{all:()=>events}});assert.equal(JSON.stringify(output.map(x=>x.json.estado)),JSON.stringify(['valido','duplicado_en_lote','invalido']));});
