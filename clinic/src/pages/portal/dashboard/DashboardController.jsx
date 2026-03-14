import { useUser } from '../../../hooks/useUser';
import UnifiedDashboard from './views/UnifiedDashboard';

export default function DashboardController() {
  const { user } = useUser();

  if (user?.role === 'clinic_admin') return '';

  if(['branch_admin', 'veterinarian', 'groomer', 'staff'].includes(user?.role)) {
    return <UnifiedDashboard />;
  }
  
  return '';
}