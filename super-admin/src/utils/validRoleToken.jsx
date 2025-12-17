import { jwtDecode } from 'jwt-decode';

export function validRoleToken(allowedRoles = []) {
  const token = localStorage.getItem('access_token');
  if(!token) return null;

  try {
    const { exp, role } = jwtDecode(token);
    // check token
    if(!exp || exp * 1000 < Date.now()) {
      localStorage.removeItem('access_token');
      return null;
    }

    return allowedRoles.includes(role) ? role : null;
  } catch {
    localStorage.removeItem('access_token');
    return null;
  }
}
