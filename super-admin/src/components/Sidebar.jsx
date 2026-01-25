import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
// hooks
import { useUser } from '../hooks/useUser'
import { usePlatform } from '../hooks/usePlatform'
import { useUI } from '../hooks/useUI'
// utils
import wait from '../utils/wait'
// icons
import { RxHamburgerMenu } from "react-icons/rx"
import { MdOutlineClose, MdOutlineHomeRepairService } from "react-icons/md"
import { RiDashboardLine } from "react-icons/ri"
import { CgFileDocument } from "react-icons/cg"
import { LuBuilding2 } from "react-icons/lu"
import { TbGraph, TbLogout } from "react-icons/tb"
import { MdOutlineSubscriptions } from "react-icons/md";

const sidebarItems = [
  { label: 'Dashboard', path: '/dashboard', icon: RiDashboardLine },
  { label: 'Clinic Applications', path: '/clinic-applications', icon: CgFileDocument },
  { label: 'Registered Clinics', path: '/registered-clinics', icon: LuBuilding2 },
  { label: 'Subscription Plans', path: '/subscription-plans', icon: MdOutlineSubscriptions},
  { label: 'Service Management', path: '/service-management', icon: MdOutlineHomeRepairService},
  { label: 'Platform Analytics', path: '/platform-analytics', icon: TbGraph }
];

const API_URL = import.meta.env.VITE_API_URL;

export default function Sidebar({className, open, setOpen}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser } = useUser();
  const { platformData } = usePlatform();
  const { showLoader, hideLoader } = useUI();

  const toggleMenu = () => {
    setOpen(!open);
  }

  const logout = async () => {
    showLoader('Logging out...');
    await wait(1000);
    localStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
    hideLoader();
  }
  return (
    <aside 
      className={`fixed top-0 left-0 z-100 border-r h-screen bg-(--clr-primary) transition-all duration-500 ease-in-out
      ${open ? 'w-64' : 'w-18'} ${className}`}
    >
      {/* header */}
      <div className={`p-4 flex items-center justify-between  ${open ? 'bg-(--clr-black)' : 'bg-(--clr-primary) border-b border-b-black'}`}>
        <motion.div
          className="overflow-hidden whitespace-nowrap text-(--clr-text-secondary) w-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-2">
            {platformData?.platform_logo && (
              <img 
                src={`${API_URL}/${platformData.platform_logo}`} 
                alt="Logo" 
                className="object-contain w-auto h-6 rounded-sm"
                onError={(e) => (e.target.style.display = 'none')} 
              />
            )}
            
            <h1 title={platformData?.platform_name} className="text-xl font-bold text-(--clr-text-header) tracking-tight pr-4 truncate">
              {platformData?.platform_name || "LOGO"}
            </h1>
          </div>
        

          <h2 className="text-sm capitalize">{user?.role.replace(/_/g, ' ')} Portal</h2>
        </motion.div>
        
        {/* hamburger */}
        <div onClick={toggleMenu} className='cursor-pointer'>
          <RxHamburgerMenu className={`hover:text-(--clr-text-secondary) duration-300 ease-in-out ${open ? 'hidden' : 'block'}`} size={32} />
          <MdOutlineClose className={`transition-transform hover:rotate-90 duration-300 ease-in-out text-(--clr-text-secondary) ${open ? 'block' : 'hidden'}`} size={32} />
        </div>
      </div>

      {/* nav links */}
      <nav className='flex flex-col justify-between h-full px-4 mt-6'>
        <div className='grid gap-2'>
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname === `${item.path}/`;

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
            className={`flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-(--clr-black) text-gray-300 overflow-hidden cursor-pointer`}
          >
            <div className="shrink-0">
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
        flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-(--clr-black) text-gray-300 overflow-hidden
        ${active ? 'bg-(--clr-black)' : ''}
      `}
    >
      <div className="shrink-0">
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