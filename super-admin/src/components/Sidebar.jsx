import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
// icons
import { RxHamburgerMenu } from "react-icons/rx"
import { MdOutlineClose } from "react-icons/md"
import { RiDashboardLine } from "react-icons/ri"
import { CgFileDocument } from "react-icons/cg"
import { LuBuilding2 } from "react-icons/lu"
import { TbGraph, TbLogout } from "react-icons/tb"
// hooks
import { useUI } from '../hooks/useUI'
// utils
import wait from '../utils/wait'

const sidebarItems = [
  { label: 'Dashboard', path: '/super-admin/dashboard', icon: RiDashboardLine },
  { label: 'Clinic Applications', path: '/super-admin/clinic-applications', icon: CgFileDocument },
  { label: 'Registered Clinics', path: '/super-admin/registered-clinics', icon: LuBuilding2 },
  { label: 'Platform Analytics', path: '/super-admin/platform-analytics', icon: TbGraph }
];

export default function Sidebar({className, open, setOpen}) {
  const { showLoader, hideLoader } = useUI();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setOpen(!open);
  }

  const logout = async () => {
    showLoader('Logging out...');
    await wait(1000);
    localStorage.clear();
    navigate('/login', { replace: true });
    hideLoader();
  }
  return (
    <aside 
      className={`fixed top-0 left-0 z-100 border-r h-screen bg-[var(--clr-primary)] transition-all duration-500 ease-in-out
      ${open ? 'w-64' : 'w-18'} ${className}}`}
    >
      {/* header */}
      <div className={`p-4 flex items-center justify-between bg-[var(--clr-primary)] ${open ? '' : 'border-b border-b-black'}`}>
        <motion.div
          className="overflow-hidden whitespace-nowrap text-[var(--clr-text-secondary)]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-medium">PETCARE</h1>
          <h2 className="text-sm">Super Admin Portal</h2>
        </motion.div>
        
        {/* hamburger */}
        <div onClick={toggleMenu} className='cursor-pointer'>
          <RxHamburgerMenu className={`hover:text-[var(--clr-text-secondary)] duration-300 ease-in-out ${open ? 'hidden' : 'block'}`} size={32} />
          <MdOutlineClose className={`transition-transform hover:rotate-90 duration-300 ease-in-out hover:text-[var(--clr-text-secondary)] ${open ? 'block' : 'hidden'}`} size={32} />
        </div>
      </div>

      {/* nav links */}
      <nav className='flex flex-col justify-between h-full px-4 mt-6'>
        <div className='grid gap-2'>
          {sidebarItems.map((item) => {
          let isActive = false;

          if(item.path === '/super-admin/dashboard') {
            isActive = location.pathname === '/super-admin/dashboard' 
              || location.pathname === '/super-admin'
              || location.pathname === '/super-admin/';
          } else {
            isActive = location.pathname === item.path;
          }

          return (
            <SidebarItem
              key={item.path}
              item={item}
              open={open}
              active={isActive}
            />
          )
        })}
        </div>

        <div className='mt-auto mb-30'>
          <button 
            onClick={logout}
            className={`flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-[var(--clr-black)] text-gray-300 overflow-hidden cursor-pointer`}
          >
            <div className="flex-shrink-0">
              <TbLogout size={22} />
            </div>
            {open && (
              <motion.span
                initial={{ opacity: 0, x: -20, width: 0 }} 
                animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20, width: open ? 'auto' : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Logout
              </motion.span>
            )}
          </button>
        </div>
      </nav>
    </aside>
  )
}


function SidebarItem({ item, open, active }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className={`
        flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-[var(--clr-black)] text-gray-300 overflow-hidden
        ${active ? 'bg-[var(--clr-black)]' : ''}
      `}
    >
      <div className="flex-shrink-0">
        <Icon size={22} />
      </div>

      {open && (
        <motion.span
          initial={{ opacity: 0, x: -20, width: 0 }} 
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20, width: open ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden whitespace-nowrap"
        >
          {item.label}
        </motion.span>
      )}
    </Link>
  )
}