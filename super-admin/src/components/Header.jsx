import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser'
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";

const links = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clinic Applications', path: '/clinic-applications' },
  { label: 'Registered Clinics', path: '/registered-clinics' },
  { label: 'Subscription Plans', path : '/subscription-plans' },
  { label: 'Transaction Management', path: '/transaction-management' },
  { label: 'Service Management', path: '/service-management' },
  { label: 'Platform Analytics', path: '/platform-analytics' },
  // nav links
  { label: 'Settings', path: '/settings' },
  { label: 'Account Security', path: '/settings/security' },
];

export default function Header() {
  const location = useLocation();
  const { user } = useUser();

  const getPageTitle = () => {
    const path = location.pathname;
    if(path === '/' || path === '/dashboard' || path === '/dashboard/') return 'Dashboard';
    const match = links.find(item => item.path === path || `${item.path}/` === path);
    return match ? match.label : 'Page Not Found';
  };

  const pageTitle = getPageTitle();
  const rawRole = user?.role?.replace(/_/g, ' ') || 'User';
  const role = `${rawRole} portal`;

  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center bg-gray-100 border-b">
      <div className="flex items-center justify-between flex-1 px-6 pl-20 md:pl-6 container-xl">
        <div className="flex flex-col">
          <motion.h1 
            key={pageTitle} 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-md sm:text-lg md:text-xl font-black uppercase tracking-tight truncate max-w-[150px] sm:max-w-none"
          >
            {pageTitle}
          </motion.h1>
          <h2 className="text-[12px] md:text-[14px] font-bold opacity-70 capitalize">
            {role}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 transition-all rounded-lg hover:bg-black hover:text-white">
            <MdOutlineNotifications size={22} />
          </button>
          <Link to="/settings" className="p-2 transition-all rounded-lg hover:bg-black hover:text-white">
            <LuSettings size={22} />
          </Link>
        </div>
      </div>
    </header>
  );
}