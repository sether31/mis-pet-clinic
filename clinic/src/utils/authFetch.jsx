

export const authFetch = async (url, options = {}) => {

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

    if (response.status === 503) {
      sessionStorage.removeItem('access_token');
      window.location.href = '/clinic/login?reason=maintenance';
      return { success: false, status: 503, message: "System Maintenance" };
    }

    // check if expired
    if(response.status === 401) {
      sessionStorage.removeItem('access_token');
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