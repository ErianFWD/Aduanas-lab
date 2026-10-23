import { createInterface } from 'node:readline/promises';
export async function ask(label,{secret=false,defaultValue=''}={}) {
  if(!process.stdin.isTTY)throw new Error('Ejecuta este comando en una terminal interactiva.');
  if(!secret){const rl=createInterface({input:process.stdin,output:process.stdout});try{return (await rl.question(label)).trim()||defaultValue;}finally{rl.close();}}
  process.stdout.write(label);process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  return new Promise((resolve,reject)=>{let value='';const done=()=>{process.stdin.off('data',listener);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};const listener=key=>{for(const char of key.replace(/\x1b\[(?:200|201)~/g,'')){if(char==='\u0003'){done();reject(new Error('Operación cancelada.'));return;}if(char==='\r'||char==='\n'){done();resolve(value);return;}if(char==='\u007f'||char==='\b')value=value.slice(0,-1);else if(!/[\u0000-\u001f]/.test(char))value+=char;}};process.stdin.on('data',listener);});
}
