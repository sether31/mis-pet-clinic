export const clearSession = () => {
  sessionStorage.removeItem('access_token');
}