import { validRoleToken } from './validRoleToken'

export const authFetch = async (url, options = {}, allowedRoles = ['super_admin']) => {
  const role = validRoleToken(allowedRoles);

  if(!role) {
    // if role is invalid it will be deleted and redirect back to login
    window.location.href = 'login?session=expired';
    return { error: 'Unauthorized', status: 401 };
  }

  const token = sessionStorage.getItem("access_token");
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  if(!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // check if token is invalid or missing
    if(response.status === 401) {
      sessionStorage.removeItem('access_token');
      window.location.href = 'login?session=expired';
      return { error: 401 };
    }

    // check if token is valid, but the role is wrong
    if(response.status === 403) {
      window.location.href = 'login?error=unauthorized'; 
      return { error: 403 };
    }

    return await response.json();
  } catch (err) {
    console.error("Network Error:", err);
    throw err;
  }
}