import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
import { BsBoxSeam } from "react-icons/bs";
import { HiShieldCheck } from 'react-icons/hi';

const sidebarItems = [
  { label: 'Dashboard', path: 'dashboard', icon: RiDashboardLine },
  { label: 'Appointment Management', path: 'appointment-management', icon: FaRegCalendarAlt, requiredPermission: 'appointment_management' },
  { label: 'Medical Management', path: 'medical-record-management', icon: HiShieldCheck, requiredPermission: 'medical_record_management' },
  { label: 'Staff Management', path: 'staff-management', icon: LuUsers, allowedRoles: ['clinic_admin', 'branch_admin'], requiredPermission: 'staff_management' },
  { label: 'Inventory Management', path: 'inventory-management', icon: BsBoxSeam, allowedRoles: ['clinic_admin', 'branch_admin'], requiredPermission: 'inventory_management' },
  { label: 'Service Management', path: 'service-management', allowedRoles: ['clinic_admin', 'branch_admin'], icon: MdOutlineHomeRepairService, requiredPermission: 'service_management' },
  { label: 'Branch Settings', path: 'branch-settings', icon: HiOutlineWrenchScrewdriver, allowedRoles: ['clinic_admin', 'branch_admin'], requiredPermission: 'branch_settings' },
];

const API_URL = import.meta.env.VITE_API_URL;

export default function Sidebar({ className, open, setOpen }) {
  const location = useLocation();
  const { branchId } = useParams();
  const { user } = useUser();
  const [selectedBranch, setSelectedBranch] = useState("");

  const visibleItems = sidebarItems.filter(item => {
    if (user?.role === 'clinic_admin') return true;
    if (item.allowedRoles && !item.allowedRoles.includes(user?.role)) return false;
    if (item.requiredPermission && !user?.permissions?.includes(item.requiredPermission)) return false;
    return true;
  });

  useEffect(() => {
    const fetchBranchName = async () => {
      try {
        const response = await authFetch(`${API_URL}/api/clinic/general/get-branch-brand.php?branch_id=${branchId}`);
        if (response.success) setSelectedBranch(response);
      } catch (err) { setSelectedBranch("Clinic Portal"); }
    };
    if (branchId) fetchBranchName();
  }, [branchId]);

  return (
    <>
      <div 
        className={`fixed top-0 left-0 z-80 flex items-center justify-center transition-all duration-500 ease-in-out
        ${open ? 'w-64 bg-(--clr-black) px-4 justify-between border-b-0' : 'w-18 bg-gray-100 border-b border-r border-black'}`}
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
                {selectedBranch?.logo_picture && (
                  <img src={`${API_URL}/${selectedBranch?.logo_picture}`} alt="Logo" className="object-contain w-auto h-6 rounded-sm" />
                )}
                <h1 className="text-xl font-bold text-(--clr-text-header) truncate">{selectedBranch?.branch_name || "LOGO"}</h1>
              </div>
              <h2 className="text-sm capitalize">{user?.role.replace(/_/g, ' ')} Portal</h2>
            </div>
          )}
        </motion.div>

        <div onClick={() => setOpen(!open)} className="cursor-pointer">
          {open ? (
            <MdOutlineClose className="text-(--clr-text-secondary) transition-transform hover:rotate-90" size={32} />
          ) : (
            <RxHamburgerMenu size={32} />
          )}
        </div>
      </div>

      {/* links */}
      <aside
        className={`fixed top-0 left-0 z-70 border-r h-screen bg-gray-100 transition-all duration-500 ease-in-out
        ${open ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-18'} ${className}`}
      >
        <nav className="flex flex-col h-full px-4 mt-28">
          <div className="grid gap-2">
            {visibleItems.map((item) => (
              <SidebarItem
                key={item.path}
                item={item}
                open={open}
                active={location.pathname.includes(`/portal/${item.path}`)}
                branchId={branchId}
                onLinkClick={() => window.innerWidth < 768 && setOpen(false)}
              />
            ))}
          </div>
        </nav>
      </aside>

      {/* backdrop for mobile */}
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

function SidebarItem({ item, open, active, branchId, onLinkClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={`/clinic/${branchId}/portal/${item.path}`}
      onClick={onLinkClick}
      className={`flex gap-2 items-center w-full px-2 py-2 transition-colors rounded font-medium hover:bg-(--clr-black) overflow-hidden hover:text-white text-sm
        ${active ? 'bg-(--clr-black) text-white' : 'text-(--clr-black)'}`}
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