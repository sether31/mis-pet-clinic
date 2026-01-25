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
  { label: 'Service Management', path: '/service-management' },
  { label: 'Platform Analytics', path: '/platform-analytics' },
  // nav links
  { label: 'Settings', path: '/settings' },
];

export default function Header() {
  const location = useLocation();
  const { user } = useUser();

  const getPageTitle = () => {
    const path = location.pathname;

    if(path === '/' || path === '/dashboard' || path === '/dashboard/') {
      return 'Dashboard';
    }
    const match = links.find(item => item.path === path || `${item.path}/` === path);
    return match ? match.label : 'Page Not Found';
  };

  const pageTitle = getPageTitle();
  const rawRole = user?.role?.replace(/_/g, ' ') || 'User';
  const role = `${rawRole} portal`;

  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center bg-(--clr-primary) border-b border-white/10">
      <div className="flex items-center justify-between flex-1 container-xl">
        <div className="flex flex-col">
          <motion.h1 
            key={pageTitle} 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl font-black uppercase tracking-tight text-(--clr-text-primary)"
          >
            {pageTitle}
          </motion.h1>
          
          {/* role */}
          <h2 className="text-[14px] font-bold text-(--clr-text-primary) capitalize">
            {role}
          </h2>
        </div>

        <div className='flex items-center gap-3'>
          <button className='p-2.5 rounded-xl bg-(--clr-black) text-(--clr-text-secondary) cursor-pointer hover:opacity-85 transition-all duration-300 relative group'>
            <MdOutlineNotifications size={20} />
            <span className="absolute w-2 py-[2px] px-1 text-xs bg-red-500 border-2 border-none rounded-full -top-1 -right-1 w-max h-max">
              31
            </span>
          </button>

          <Link to="/settings" className='p-2.5 rounded-xl bg-(--clr-black) text-(--clr-text-secondary) cursor-pointer hover:opacity-85 transition-all duration-300'>
            <LuSettings size={20} />
          </Link>
        </div>
      </div>
    </header>
  );
}