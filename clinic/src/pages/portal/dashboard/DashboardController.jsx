import React from 'react';
import { useUser } from '../../../hooks/useUser';
import VetDashboard from './views/VeterinarianDashboard';

export default function DashboardController() {
  const { user } = useUser();

  if (user?.role === 'clinic_admin') return '';
  if (user?.role === 'veterinarian') return <VetDashboard />;
  
  return '';
}