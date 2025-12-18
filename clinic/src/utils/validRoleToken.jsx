import { jwtDecode } from 'jwt-decode';

export function validRoleToken() {
  const token = localStorage.getItem('access_token');
  if(!token) return null;

  try {
    const { exp, role, status } = jwtDecode(token);
    // check token
    if(!exp || exp * 1000 < Date.now()) {
      localStorage.removeItem('access_token');
      return null;
    }

    return {
      role,
      status
    };
  } catch {
    localStorage.removeItem('access_token');
    return null;
  }
}
