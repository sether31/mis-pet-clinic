import { useUser } from '../../../hooks/useUser';
import ClinicAdminDashboard from './views/ClinicAdminDashboard';
import UnifiedDashboard from './views/UnifiedDashboard';

export default function DashboardController() {
  const { user } = useUser();

  if (user?.role === 'clinic_admin') return <ClinicAdminDashboard />;

  if(['branch_admin', 'veterinarian', 'groomer', 'staff'].includes(user?.role)) {
    return <UnifiedDashboard />;
  }
  
  return '';
}