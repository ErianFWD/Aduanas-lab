import { Link } from 'react-router-dom';
export default function NotFound(){return <div className="empty"><span className="error-code">404</span><h1>Esta ruta no existe.</h1><p>Vuelve al centro de control para continuar.</p><Link to="/" className="btn btn-primary">Ir al resumen</Link></div>;}
