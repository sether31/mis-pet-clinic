import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser'
// utils
import { authFetch } from '../utils/authFetch';
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";


const links = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Clinic Applications', path: '/clinic-applications' },
  { label: 'Registered Clinics', path: '/registered-clinics' },
  { label: 'Subscription Management', path : '/subscription-management' },
  { label: 'Transaction Management', path: '/transaction-management' },
  { label: 'Service Management', path: '/service-management' },
  { label: 'Platform Analytics', path: '/platform-analytics' },
  // nav links
  { label: 'Notifications', path: '/notifications' },
  { label: 'Settings', path: '/settings' },
  { label: 'Account Security', path: '/settings/security' },
];

const API_URL = import.meta.env.VITE_API_URL;

export default function Header() {
  const location = useLocation();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/super-admin/notifications/get-unread-count.php`);
      if (res.success) {
        setUnreadCount(res.count);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    }

    // 2. Listen for 'syncUnreadCount' events (triggered by your Notifications page)
    const handleSync = (e) => {
      setUnreadCount(e.detail);
    };

    window.addEventListener('syncUnreadCount', handleSync);
    return () => window.removeEventListener('syncUnreadCount', handleSync);
  }, [user]);

  const getPageTitle = () => {
    const path = location.pathname;
    if(path === '/' || path === '/dashboard' || path === '/dashboard/') return 'Dashboard';
    const match = links.find(item => item.path === path || `${item.path}/` === path);
    return match ? match.label : 'Page Not Found';
  };

  const pageTitle = getPageTitle();
  const rawRole = user?.role?.replace(/_/g, ' ') || 'User';
  const role = `${rawRole} portal`;

  const isSettingsActive = location.pathname.includes('/settings');
  const isNotificationsActive = location.pathname.includes('/notifications');

  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center bg-gray-100 border-b">
      <div className="flex items-center justify-between flex-1 px-6 pl-20 md:pl-6 container-xl">
        <div className="flex flex-col">
          <h1 
            className="text-md sm:text-lg md:text-xl font-black uppercase tracking-tight truncate max-w-[150px] sm:max-w-none"
          >
            {pageTitle}
          </h1>
          <h2 className="text-[12px] md:text-[14px] font-bold opacity-70 capitalize">
            {role}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Link 
            to={`/notifications`}
            className={`relative p-1 transition-all rounded-lg hover:bg-black hover:text-white ${
              isNotificationsActive ? 'bg-black text-white' : 'text-gray-800'
            }`}
          >
            <MdOutlineNotifications size={22} />
            
            {/* Notification Badge Logic */}
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-gray-100 transform translate-x-1/3 -translate-y-1/3">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            
          </Link>
          <Link 
            to={`/settings`}
            className={`p-1 transition-all rounded-lg hover:bg-black hover:text-white ${
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