import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

  const logout = async () => {
    showLoader('Logging out...');
    await wait(1000);
    localStorage.clear();
    setUser(null);
    navigate('/login', { replace: true });
    hideLoader();
  }

  return (
    <>
      <div 
        className={`fixed top-0 left-0 z-[110] flex items-center transition-all duration-500 ease-in-out
        ${open 
          ? 'w-64 bg-(--clr-black) px-4 justify-between border-b-0' 
          : 'w-18 bg-gray-100 border-b border-r border-black justify-center'}`}
        style={{ height: '81px' }}
      >
        <motion.div
          className={`overflow-hidden ${open ? '' : 'hidden'} whitespace-nowrap text-(--clr-text-secondary) w-full`}
          initial={false}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -20 }}
        >
          {open && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {platformData?.platform_logo && (
                  <img src={`${API_URL}/${platformData.platform_logo}`} alt="Logo" className="object-contain w-auto h-6 rounded-sm" />
                )}
                <h1 className="text-xl font-bold text-(--clr-text-header) truncate">{platformData?.platform_name || "LOGO"}</h1>
              </div>
              <h2 className="text-sm capitalize">{user?.role.replace(/_/g, ' ')} Portal</h2>
            </div>
          )}
        </motion.div>
        
        <div 
          onClick={() => setOpen(!open)} 
          className={`cursor-pointer flex items-center justify-center ${!open ? 'w-full h-full' : ''}`}
        >
          {open ? (
            <MdOutlineClose className="text-(--clr-text-secondary) transition-transform hover:rotate-90" size={32} />
          ) : (
            <RxHamburgerMenu size={32} />
          )}
        </div>
      </div>

      {/* links */}
      <aside 
        className={`fixed top-0 left-0 z-[100] border-r h-screen bg-gray-100 transition-all duration-500 ease-in-out
        ${open ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-18'} ${className}`}
      >
        <nav className='flex flex-col justify-between h-full px-4 mt-28'>
          <div className='grid gap-2'>
            {sidebarItems.map((item) => (
              <SidebarItem
                key={item.path}
                item={item}
                open={open}
                active={location.pathname === item.path || location.pathname === `${item.path}/`}
                onClick={() => window.innerWidth < 768 && setOpen(false)}
              />
            ))}
          </div>

          <div className='mt-auto mb-10'>
            <button 
              onClick={logout}
              className="flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-(--clr-black) text-gray-500 hover:text-white overflow-hidden cursor-pointer text-sm"
            >
              <div className="shrink-0"><TbLogout size={22} /></div>
              {open && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap">
                  Logout
                </motion.span>
              )}
            </button>
          </div>
        </nav>
      </aside>

      {/* backdrop on mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-black/40 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  )
}

function SidebarItem({ item, open, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-(--clr-black) hover:text-white text-(--clr-black) overflow-hidden text-sm
        ${active ? 'bg-(--clr-black) text-white' : ''}`}
    >
      <div className="shrink-0"><Icon size={22} /></div>
      {open && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap">
          {item.label}
        </motion.span>
      )}
    </Link>
  )
}