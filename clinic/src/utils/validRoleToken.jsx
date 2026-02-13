import { jwtDecode } from 'jwt-decode';

export function validRoleToken(allowedRoles = [
  'clinic_admin', 'branch_admin', 'staff', 'veterinarian', 'groomer'
]) {
  const token = sessionStorage.getItem('access_token');
  if(!token) return null;

  try {
    const { exp, role, status, branch_id, permissions, fname, lname, email, user_id } = jwtDecode(token);

    if(!exp || exp * 1000 < Date.now()) {
      sessionStorage.removeItem('access_token');
      return null;
    }

    // check if allowed
    if(!allowedRoles.includes(role)) {
      return null;
    }

    return { 
      user_id,
      role, 
      status, 
      branch_id,       
      permissions: permissions || [], 
      fname,
      lname,
      email
    };
  } catch {
    sessionStorage.removeItem('access_token');
    return null;
  }
}