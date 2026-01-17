export const getDashboardByRole = (role, branchId = null) => {
  const routes = {
    'clinic_admin': '/clinic/select-branch',
    'branch_admin': branchId ? `/clinic/${branchId}/portal/dashboard` : '/clinic/login',
    'veterinarian': branchId ? `/clinic/${branchId}/portal/dashboard` : '/clinic/login',
    'groomer': branchId ? `/clinic/${branchId}/portal/dashboard` : '/clinic/login',
    'staff': branchId ? `/clinic/${branchId}/portal/dashboard` : '/clinic/login',
  };

  return routes[role] || '/clinic/login';
};