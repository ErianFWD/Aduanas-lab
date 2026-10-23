import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

const cookieName = 'aduana_session';
export function publicUser(row) {
  return {id: row.id_funcionario, nombre: row.nombre, correo: row.correo, cargo: row.cargo, rol: row.rol};
}
export function setSession(res, row) {
  const token = jwt.sign({sub: String(row.id_funcionario), ver: row.session_version}, config.jwtSecret, {expiresIn: '4h', issuer: 'aduana-lab3', audience: 'aduana-web'});
  res.cookie(cookieName, token, {httpOnly: true, secure: config.production, sameSite: 'lax', maxAge: 4*60*60*1000, path: '/'});
}
export function clearSession(res) {
  res.clearCookie(cookieName, {httpOnly: true, secure: config.production, sameSite: 'lax', path: '/'});
}
export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(cookieName+'='))?.slice(cookieName.length+1);
    if (!token) return res.status(401).json({error: 'Inicia sesión para continuar.'});
    const claims = jwt.verify(token, config.jwtSecret, {issuer: 'aduana-lab3', audience: 'aduana-web', algorithms:['HS256']});
    const [row] = await query('SELECT id_funcionario,nombre,correo,cargo,rol,activo,session_version FROM funcionario WHERE id_funcionario=?', [claims.sub]);
    if (!row || !row.activo || row.session_version !== claims.ver) return res.status(401).json({error:'La sesión terminó. Inicia sesión nuevamente.'});
    req.user = publicUser(row);
    next();
  } catch (err) {
    if (['JsonWebTokenError','TokenExpiredError','NotBeforeError'].includes(err.name)) return res.status(401).json({error:'La sesión terminó. Inicia sesión nuevamente.'});
    next(err);
  }
}
export const requireRole = (...roles) => (req,res,next) => roles.includes(req.user.rol) ? next() : res.status(403).json({error:'Tu cuenta no tiene permiso para esta acción.'});
