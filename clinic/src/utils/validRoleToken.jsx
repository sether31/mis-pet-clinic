import { jwtDecode } from 'jwt-decode';

export function validRoleToken(allowedRoles = [
  'clinic_admin', 'staff', 'veterinarian', 'groomer'
]) {
  const token = localStorage.getItem('access_token');
  if(!token) return null;

  try {
    const { exp, role, status } = jwtDecode(token); 

    if(!exp || exp * 1000 < Date.now()) {
      localStorage.removeItem('access_token');
      return null;
    }

    // check if allowed
    return allowedRoles.includes(role) ? { role, status } : null;
  } catch {
    localStorage.removeItem('access_token');
    return null;
  }
}