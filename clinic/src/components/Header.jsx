import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
// hooks
import { useUser } from '../hooks/useUser';
// utils 
import { authFetch } from '../utils/authFetch'; 
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";

const API_URL = import.meta.env.VITE_API_URL;

const links = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Appointment Management', path: '/appointment-management' },
  { label: 'Shop Management', path: '/shop-management' },
  { label: 'Medical Record Management', path: '/medical-record-management' },
  { label: 'Inventory Management', path: '/inventory-management' },
  { label: 'Transaction Management', path: '/transaction-management' },
  { label: 'Staff Management', path: '/staff-management' },
  { label: 'Service Management', path: '/service-management' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Branch Settings', path: '/branch-settings' },
  { label: 'Notifications', path: '/notifications'},
  { label: 'Settings', path: '/settings'},
];

export default function Header() {
  const { branchId } = useParams();
  const location = useLocation();
  const { user } = useUser();
  
  // State for the notification count
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/notifications/get-unread-count.php?branch_id=${branchId}`);
        if (res?.success) {
          setUnreadCount(res.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch unread count:", error);
      }
    };

    if (user?.user_id && branchId) {
      fetchUnreadCount();
    }

    const handleLocalUpdate = (e) => {
      setUnreadCount(e.detail); 
    };

    window.addEventListener('syncUnreadCount', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('syncUnreadCount', handleLocalUpdate);
    };
  }, [user?.user_id, branchId]);

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