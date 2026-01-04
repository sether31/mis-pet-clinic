export default function getDashboardByRole(role) {
  const routes = {
    'clinic_admin': '/clinic/select-branch',
  };

  return routes[role] || null;
};
