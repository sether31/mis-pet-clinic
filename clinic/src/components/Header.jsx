import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser'
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";

const links = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Appointment Management', path: '/appointment-management' },
  { label: 'Shop Management', path: '/shop-management' },
  { label: 'Medical Record Management', path: '/medical-record-management' },
  { label: 'Inventory Management', path: '/inventory-management' },
  { label: 'Transaction Management', path: '/transaction-management' },
  { label: 'Staff Management', path: '/staff-management' },
  { label: 'Service Management', path: '/service-management' },
  { label: 'Branch Settings', path: '/branch-settings' },
  // other links
  { label: 'Notifications', path: '/notifications'},
  { label: 'Settings', path: '/settings'},
];

export default function Header() {
  const { branchId } = useParams();
  const location = useLocation();
  const { user } = useUser();

  const getPageTitle = () => {
    const path = location.pathname;
    const isDashboard = path.endsWith('/portal') || path.includes('/portal/dashboard');
    if (isDashboard) return 'Dashboard';
    const match = links.find(item => path.includes(`/portal${item.path}`));
    return match ? match.label : 'Page Not Found'; 
  };

  const pageTitle = getPageTitle();
  const role = `${user?.role?.replace(/_/g, ' ') || 'User'} portal`;

  const isSettingsActive = location.pathname.includes('/settings');
  const isNotificationsActive = location.pathname.includes('/notifications');

  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center bg-gray-100 border-b">
      <div className="flex items-center justify-between flex-1 px-6 pl-20 md:pl-6 container-xl">
        <div className="flex flex-col">
          <motion.h1 
            key={pageTitle} 
            className="text-md sm:text-lg md:text-xl font-black uppercase tracking-tight truncate max-w-[150px] sm:max-w-none"
          >
            {pageTitle}
          </motion.h1>
          <h2 className="text-[12px] md:text-[14px] font-bold opacity-70 capitalize">
            {role}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to={`/clinic/${branchId}/portal/notifications`}
            className={`p-2 transition-all rounded-lg hover:bg-black hover:text-white ${
              isNotificationsActive ? 'bg-black text-white' : 'text-gray-800'
            }`}
          >
            <MdOutlineNotifications size={22} />
          </Link>
          <Link 
            to={`/clinic/${branchId}/portal/settings`}
            className={`p-2 transition-all rounded-lg hover:bg-black hover:text-white ${
              isSettingsActive ? 'bg-black text-white' : 'text-gray-800'
            }`}
          >
            <LuSettings size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}