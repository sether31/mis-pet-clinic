import { jwtDecode } from 'jwt-decode';

export function validRoleToken(allowedRoles = []) {
  const token = localStorage.getItem('access_token');
  if(!token) return null;

  try {
    const decoded = jwtDecode(token);
    const { exp, role } = decoded;
    // check token
    if(!exp || exp * 1000 < Date.now()) {
      localStorage.removeItem('access_token');
      return null;
    }

    return allowedRoles.includes(role) ? decoded : null;
  } catch {
    localStorage.removeItem('access_token');
    return null;
  }
}
