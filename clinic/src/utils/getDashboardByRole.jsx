export const getDashboardByRole = (role, branchId = null) => {
  if (role === 'clinic_admin') {
    return '/clinic/select-branch';
  }

  if (branchId) {
    return `/clinic/${branchId}/portal/dashboard`;
  }

  return '/clinic/login';
};