export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("access_token");

  const headers = {
    ...options.headers,
    Authorization: token ? `Bearer ${token}` : undefined,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if(response.status === 401) {
      return { error: response.status };
    }

    return await response.json();
  } catch(err) {
    console.error(err);
    throw err;
  }
}
