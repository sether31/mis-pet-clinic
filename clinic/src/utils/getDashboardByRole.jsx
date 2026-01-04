export default function getDashboardByRole(role) {
  const routes = {
    'clinic_admin': '/select-branch',
  };

  return routes[role] || null;
};
