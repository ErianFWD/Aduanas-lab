import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
const sqlFile=fileURLToPath(new URL('../../database/Aduana_Lab3_SQLite.sql',import.meta.url));

export function initializeDatabase() {
  if(fs.existsSync(config.dbPath)) return false;
  fs.mkdirSync(path.dirname(config.dbPath),{recursive:true});
  const temp=config.dbPath+'.initializing-'+process.pid;
  const db=new DatabaseSync(temp);
  try {
    db.exec(fs.readFileSync(sqlFile,'utf8'));
    if(db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Relaciones inválidas en los datos iniciales.');
    db.close();
    fs.renameSync(temp,config.dbPath);
    return true;
  } catch(err) {
    try {db.close();} catch {}
    fs.rmSync(temp,{force:true});
    throw err;
  }
}
initializeDatabase();
export const database=new DatabaseSync(config.dbPath);
database.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
// Conexión independiente: el agente solo puede ejecutar SELECT preparados.
export const reader=new DatabaseSync(config.dbPath,{readOnly:true});
reader.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000;');
export async function query(sql,params=[]) {
  const statement=database.prepare(sql);
  if(/^\s*SELECT\b/i.test(sql)) return statement.all(...params);
  const result=statement.run(...params);
  return {affectedRows:Number(result.changes),insertId:Number(result.lastInsertRowid)};
}
// Adaptador de transacción síncrona. No cede el control entre lectura y escritura.
export function movementConnection() {
  const db=new DatabaseSync(config.dbPath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  return {
    beginTransaction(){db.exec('BEGIN IMMEDIATE');},
    execute(sql,params=[]) {
      const statement=db.prepare(sql);
      if(/^\s*SELECT\b/i.test(sql)) return [statement.all(...params)];
      const result=statement.run(...params);
      return [{affectedRows:Number(result.changes),insertId:Number(result.lastInsertRowid)}];
    },
    commit(){db.exec('COMMIT');},
    rollback(){if(db.isTransaction) db.exec('ROLLBACK');},
    release(){db.close();}
  };
}
export const pool={async end(){reader.close();database.close();}};
