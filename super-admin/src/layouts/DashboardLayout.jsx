import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
// components
import SideBar from '../components/Sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-x-hidden"> 
      <SideBar open={sidebarOpen} setOpen={setSidebarOpen} />
      <motion.main
        initial={false}
        animate={{ 
          marginLeft: isMobile ? 0 : (sidebarOpen ? 256 : 72),
          width: isMobile ? '100%' : `calc(100% - ${sidebarOpen ? 256 : 72}px)`
        }} 
        transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
        className="relative flex flex-col min-h-screen min-w-0"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}