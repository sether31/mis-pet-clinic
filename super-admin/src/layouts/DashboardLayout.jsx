import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
// components
import SideBar from '../components/Sidebar';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      {/* <Header /> */}
      <SideBar open={sidebarOpen} setOpen={setSidebarOpen} />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 256 : 64 }} 
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
      >
        <div className='fixed top-0 left-0 w-full border-b h-[81px] bg-[var(--clr-primary)] z-49'></div>
        <Outlet />
      </motion.main>
    </div>
  )
}
