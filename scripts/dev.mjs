import { spawn } from 'node:child_process';
const npm=process.platform==='win32'?'npm.cmd':'npm';
const children=[spawn(npm,['run','dev','--workspace','backend'],{stdio:'inherit',shell:process.platform==='win32'}),spawn(npm,['run','dev','--workspace','frontend','--','--port',process.env.PORT_WEB || '5173'],{stdio:'inherit',shell:process.platform==='win32'})];
let ending=false;
function stop(code=0){if(ending)return;ending=true;for(const p of children)p.kill();setTimeout(()=>process.exit(code),300).unref();}
for(const p of children){p.on('error',()=>stop(1));p.on('exit',code=>stop(code||0));}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
