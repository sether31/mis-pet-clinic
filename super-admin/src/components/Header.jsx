import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
// icons
import { MdOutlineNotifications } from "react-icons/md";
import { LuSettings } from "react-icons/lu";


const links = [
  { label: 'Dashboard', path: '/super-admin/dashboard' },
  { label: 'Clinic Applications', path: '/super-admin/clinic-applications' },
  { label: 'Registered Clinics', path: '/super-admin/registered-clinics' },
  { label: 'Platform Analytics', path: '/super-admin/platform-analytics' }
];

export default function Header() {
  const location = useLocation();

  const currentRoute = links.find(item => 
    location.pathname.startsWith(item.path)
  );

  const pageTitle = currentRoute ? currentRoute.label : '';
  
  return (
    <header className="sticky top-0 left-0 h-[81px] w-full z-50 flex items-center text-[var(--clr-text-secondary)]">
      <div className="flex items-center justify-between flex-1 px-0 pl-4 container-xl">
        <div>
          <h1 className="text-xl font-semibold">{pageTitle}</h1>
          <h1 className="font-semibold">{pageTitle}</h1>
        </div>

        <div className='flex items-center gap-4'>
          <div className='p-2 rounded bg-[var(--clr-black)] cursor-pointer hover:scale-90 ease-in-out duration-300'>
            <MdOutlineNotifications size={22} />
          </div>
          <div className='p-2 rounded bg-[var(--clr-black)] cursor-pointer hover:scale-90 ease-in-out duration-300'>
            <LuSettings size={22} />
          </div>
        </div>
      </div>
    </header>
  )
}
