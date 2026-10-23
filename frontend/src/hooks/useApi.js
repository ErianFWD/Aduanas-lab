import { useState,useEffect,useCallback } from 'react';
import { api } from '../services/api.js';
export function useApi(path) {
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();setLoading(true);setError('');api(path,{signal:controller.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[path,revision]);
  const reload=useCallback(()=>setRevision(r=>r+1),[]);
  return {data,loading,error,reload};
}
