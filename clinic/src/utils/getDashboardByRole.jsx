export const getDashboardByRole = (role, branchId = null) => {
  if (branchId) {
    return `/clinic/${branchId}/portal/dashboard`;
  }
  
  if (role === 'clinic_admin') {
    return '/clinic/select-branch';
  }

  return '/clinic/login';
};