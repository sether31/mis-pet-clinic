import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser'
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";

const links = [
  { label: 'Dashboard', path: '/super-admin/dashboard' },
  { label: 'Clinic Applications', path: '/super-admin/clinic-applications' },
  { label: 'Registered Clinics', path: '/super-admin/registered-clinics' },
  { label: 'Subscription Plans', path : '/super-admin/subscription-plans' },
  { label: 'Platform Analytics', path: '/super-admin/platform-analytics' }
];

export default function Header() {
  const location = useLocation();
  const { user } = useUser();

  const getPageTitle = () => {
    if(location.pathname === '/super-admin' || location.pathname === '/super-admin/') {
      return 'Dashboard';
    }
    const currentRoute = links.find(item => location.pathname.startsWith(item.path));
    return currentRoute ? currentRoute.label : 'Page Not Found';
  };

  const pageTitle = getPageTitle();
  const rawRole = user?.role?.replace(/_/g, ' ') || 'User';
  const role = `${rawRole} portal`;

  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center bg-[var(--clr-primary)] border-b border-white/10">
      <div className="flex items-center justify-between flex-1 px-6 container-xl">
        <div className="flex flex-col">
          <motion.h1 
            key={pageTitle} 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-black uppercase tracking-tight text-[var(--clr-text-primary)]"
          >
            {pageTitle}
          </motion.h1>
          
          {/* role */}
          <h2 className="text-[14px] font-bold text-[var(--clr-text-primary)] capitalize">
            {role}
          </h2>
        </div>

        {/* Right Side: Actions */}
        <div className='flex items-center gap-3'>
          <button className='p-2.5 rounded-xl bg-[var(--clr-black)] text-[var(--clr-text-secondary)] cursor-pointer hover:opacity-85 transition-all duration-300 relative group'>
            <MdOutlineNotifications size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-[var(--clr-black)] rounded-full"></span>
          </button>

          <button className='p-2.5 rounded-xl bg-[var(--clr-black)] text-[var(--clr-text-secondary)] cursor-pointer hover:opacity-85 transition-all duration-300'>
            <LuSettings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}