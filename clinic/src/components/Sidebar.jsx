import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
// hooks
import { useUser } from '../hooks/useUser';
// utils
import { authFetch } from '../utils/authFetch';
// icons
import { RxHamburgerMenu } from "react-icons/rx"
import { MdOutlineClose, MdOutlineHomeRepairService } from "react-icons/md"
import { RiDashboardLine } from "react-icons/ri"
import { LuUsers } from 'react-icons/lu';
import { FaRegCalendarAlt } from "react-icons/fa";
import { HiOutlineWrenchScrewdriver } from 'react-icons/hi2';

const sidebarItems = [
  { label: 'Dashboard', path: 'dashboard', icon: RiDashboardLine },
  { 
    label: 'Appointment Management', 
    path: 'appointment-management', 
    icon: FaRegCalendarAlt, 
    requiredPermission: 'appointment_management' 
  },
  { 
    label: 'Staff Management', 
    path: 'staff-management', 
    icon: LuUsers, 
    requiredPermission: 'staff_management' 
  },
  { 
    label: 'Service Management', 
    path: 'service-management', 
    icon: MdOutlineHomeRepairService, 
    requiredPermission: 'service_management' 
  },
  { 
    label: 'Branch Settings', 
    path: 'branch-settings', 
    icon: HiOutlineWrenchScrewdriver, 
    requiredPermission: 'branch_settings' 
  },
];

const API_URL = import.meta.env.VITE_API_URL;

export default function Sidebar({className, open, setOpen}) {
  const location = useLocation();
  const { branchId } = useParams();
  const { user } = useUser(); 
  const [selectedBranch, setSelectedBranch] = useState("");

  const visibleItems = sidebarItems.filter(item => {
    // if clinic admin allow all
    if(user?.role === 'clinic_admin') return true;

    // check staff permission 
    if(item.requiredPermission) {
      return user?.permissions?.includes(item.requiredPermission);
    }

    // check if have specific roles
    if(item.allowedRoles) {
      return item.allowedRoles.includes(user?.role);
    }

    return true;
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if(token) {
      try {
        // get branch name
        const fetchBranchName = async () => {
          try {
            const response = await authFetch(`${API_URL}/api/clinic/general/get-branch-brand.php?branch_id=${branchId}`);
            if(response.success) {
              setSelectedBranch(response);
            }
          } catch(err) {
            setSelectedBranch("Clinic Portal");
          }
        };

      if (branchId) fetchBranchName();
      } catch(error) {
        console.error("Invalid token:", error);
      }
    }
  }, [branchId]);

  const toggleMenu = () => {
    setOpen(!open);
  }

  return (
    <aside 
      className={`fixed top-0 left-0 z-100 border-r h-screen bg-(--clr-primary) transition-all duration-500 ease-in-out
      ${open ? 'w-64' : 'w-18'} ${className}}`}
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
            {selectedBranch?.logo_picture && (
              <img 
                src={`${API_URL}/${selectedBranch?.logo_picture}`} 
                alt="Logo" 
                className="object-contain w-auto h-6 rounded-sm"
                onError={(e) => (e.target.style.display = 'none')} 
              />
            )}
            
            <h1 title={selectedBranch?.branch_name} className="text-xl font-bold text-(--clr-text-header) tracking-tight pr-2 truncate">
              {selectedBranch?.branch_name || "LOGO"}
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
          {visibleItems.map((item) => { 
            const isActive = location.pathname.includes(`/portal/${item.path}`);
            return (
              <SidebarItem
                key={item.path}
                item={item}
                open={open}
                active={isActive}
                branchId={branchId}
              />
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

function SidebarItem({ item, open, active, branchId }) {
  const Icon = item.icon;
  const fullPath = `/clinic/${branchId}/portal/${item.path}`;
  return (
    <Link
      to={fullPath}
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
