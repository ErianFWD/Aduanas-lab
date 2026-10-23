import {config} from '../backend/src/config.js';
import {pool} from '../backend/src/db.js';
console.log('Base SQLite lista: '+config.dbPath+' (se conservan los datos si ya existía).');
await pool.end();
