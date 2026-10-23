import { app } from './app.js';
import { config, assertConfiguration } from './config.js';
import { pool } from './db.js';
assertConfiguration();
const server=app.listen(config.port,'0.0.0.0',()=>console.log(`Aduana API: http://localhost:${config.port}`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(async()=>{await pool.end();process.exit(0);}));
