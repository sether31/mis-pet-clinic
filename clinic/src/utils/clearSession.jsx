export const clearSession = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('active_branch_id');
}