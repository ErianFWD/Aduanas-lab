import { Routes,Route,Navigate,Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading,NoAccess } from '../components/UI.jsx';
import Layout from '../layouts/Layout.jsx';
import Login from '../pages/Login.jsx';
import Dashboard from '../pages/Dashboard.jsx';
import Records from '../pages/Records.jsx';
import Warehouses from '../pages/Warehouses.jsx';
import Reports from '../pages/Reports.jsx';
import Assistant from '../pages/Assistant.jsx';
import Profile from '../pages/Profile.jsx';
import NotFound from '../pages/NotFound.jsx';
function PrivateRoute(){const {user,loading}=useAuth();if(loading)return <Loading/>;return user?<Outlet/>:<Navigate to="/login" replace/>;}
function AdminRoute(){const {user}=useAuth();return user?.rol==='admin'?<Outlet/>:<NoAccess/>;}
export default function App(){return <Routes><Route path="/login" element={<Login/>}/><Route element={<PrivateRoute/>}><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="inventario" element={<Records kind="inventario"/>}/><Route path="declaraciones" element={<Records kind="declaraciones"/>}/><Route path="bodegas" element={<Warehouses/>}/><Route path="movimientos" element={<Records kind="movimientos"/>}/><Route path="inspecciones" element={<Records kind="inspecciones"/>}/><Route path="reportes" element={<Reports/>}/><Route path="asistente" element={<Assistant/>}/><Route path="perfil" element={<Profile/>}/><Route element={<AdminRoute/>}><Route path="usuarios" element={<Records kind="usuarios"/>}/></Route><Route path="*" element={<NotFound/>}/></Route></Route></Routes>;}
