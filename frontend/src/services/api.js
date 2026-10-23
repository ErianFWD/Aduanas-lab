export async function api(path,options={}) {
  const response=await fetch('/api'+path,{credentials:'include',...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json().catch(()=>({error:'El servidor no devolvió una respuesta válida.'}));
  if(!response.ok) {
    if(response.status===401 && !path.startsWith('/auth/login'))window.dispatchEvent(new Event('aduana:unauthorized'));
    const error=new Error(data.error || 'No se pudo completar la solicitud.');error.status=response.status;throw error;
  }return data;
}
export const post=(path,body)=>api(path,{method:'POST',body:JSON.stringify(body)});
export const money=n=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));
export const num=n=>new Intl.NumberFormat('es-CR',{maximumFractionDigits:3}).format(Number(n||0));
export function date(value,withTime=false) {
  if(!value)return '—';
  const parsed=new Date(String(value).includes(' ')?value.replace(' ','T'):String(value).length===10?value+'T12:00:00':value);
  return Number.isNaN(parsed.getTime())?value:new Intl.DateTimeFormat('es-CR',{day:'2-digit',month:'short',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'}:{})}).format(parsed);
}
export function exportCSV(rows,filename) {
  if(!rows.length)return;
  const clean=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const keys=Object.keys(rows[0]);
  const csv=[keys.map(clean).join(','),...rows.map(r=>keys.map(k=>clean(r[k])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
