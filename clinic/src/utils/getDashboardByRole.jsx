export default function getDashboardByRole(role) {
  const routes = {
    'clinic_admin': '/clinic/admin/dashboard',
  };

  return routes[role] || '/login';
};
