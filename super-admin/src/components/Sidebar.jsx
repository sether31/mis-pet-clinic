import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
// icons
import { RxHamburgerMenu } from "react-icons/rx";
import { MdOutlineClose } from "react-icons/md";
import { RiDashboardLine } from "react-icons/ri";
import { CgFileDocument } from "react-icons/cg";
import { LuBuilding2 } from "react-icons/lu";
import { TbGraph } from "react-icons/tb";

const sidebarItems = [
  { label: 'Dashboard', path: '/super-admin/dashboard', icon: RiDashboardLine },
  { label: 'Clinic Applications', path: '/super-admin/clinic-applications', icon: CgFileDocument },
  { label: 'Registered Clinics', path: '/super-admin/registered-clinics', icon: LuBuilding2 },
  { label: 'Platform Analytics', path: '/super-admin/platform-analytics', icon: TbGraph }
];

export default function Sidebar({open, setOpen}) {
  const location = useLocation();

  const toggleMenu = () => {
    setOpen(!open);
  }
  return (
    <aside 
      className={`transition-all duration-500 ease-in-out fixed top-0 left-0 z-100 border-r border-r-gray-700 h-max md:h-screen 
    ${open ? 'w-64 h-screen' : 'w-18'} bg-[var(--clr-bg-page)]`}
    >
      {/* header */}
      <div className={`p-4 flex items-center justify-between ${open ? '' : 'border-b'}`}>
        <motion.div
          className="overflow-hidden whitespace-nowrap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-medium">PETCARE</h1>
          <h2 className="text-sm">Super Admin Portal</h2>
        </motion.div>
        
        {/* hamburger */}
        <div onClick={toggleMenu} className='cursor-pointer'>
          <RxHamburgerMenu className={open ? 'hidden' : 'block'} size={32} />
          <MdOutlineClose className={`transition-transform hover:rotate-90 duration-300 ease-in-out ${open ? 'block' : 'hidden'}`} size={32} />
        </div>
      </div>

      {/* nav links */}
      <nav className="grid gap-2 px-4 mt-6">
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
        flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-[var(--clr-primary)] hover:text-[var(--clr-text-secondary)] overflow-hidden
        ${active ? 'bg-[var(--clr-primary)] text-[var(--clr-text-secondary)]' : ''}
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