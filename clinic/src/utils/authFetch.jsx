import { validRoleToken } from './validRoleToken';

export const authFetch = async (url, options = {}, allowedRoles = []) => {
  const user = validRoleToken(allowedRoles);

  if(!user) {
    return { success: false, error: 'Unauthorized', status: 401 };
  }

  const token = localStorage.getItem("access_token");
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  if(!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // check if expired
    if(response.status === 401) {
      localStorage.removeItem('access_token');
      return { success: false, status: 401, message: "Session Expired" };
    }

    // check if unauthorized
    if(response.status === 403) {
      return { success: false, status: 403, message: "Access Denied" };
    }

    return await response.json();
  } catch (err) {
    console.error("Fetch Error:", err);
    return { success: false, error: "Network Error" };
  }
};