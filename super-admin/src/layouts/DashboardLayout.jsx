import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
// components
import SideBar from '../components/Sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100"> 
      <SideBar open={sidebarOpen} setOpen={setSidebarOpen} />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 64 }} 
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
