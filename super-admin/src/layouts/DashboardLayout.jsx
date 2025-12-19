import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
// components
import Sidebar from '../components/Sidebar'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <motion.main
        className="flex-1"
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 64 }} 
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
      >
        <Outlet />
      </motion.main>
    </div>
  )
}

