import { createContext,useContext,useState,useEffect } from 'react';
import { api,post } from '../services/api.js';
const Context=createContext(null);
export function AuthProvider({children}) {
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true),[connectionError,setConnectionError]=useState('');
  useEffect(()=>{let alive=true;api('/auth/me').then(r=>alive&&setUser(r.user)).catch(e=>{if(alive && e.status!==401)setConnectionError(e.message);}).finally(()=>alive&&setLoading(false));const reset=()=>setUser(null);window.addEventListener('aduana:unauthorized',reset);return()=>{alive=false;window.removeEventListener('aduana:unauthorized',reset);};},[]);
  async function login(correo,password){const r=await post('/auth/login',{correo,password});setUser(r.user);setConnectionError('');}
  async function logout(){await post('/auth/logout',{});setUser(null);}
  return <Context.Provider value={{user,loading,connectionError,login,logout,setUser}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
