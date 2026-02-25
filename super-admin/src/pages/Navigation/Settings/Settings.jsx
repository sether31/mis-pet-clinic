import { NavLink, Outlet, useOutletContext, useLocation, Link } from 'react-router-dom';
// components
import Header from '../../../components/Header';
// icons
import { RiGlobalLine, RiShieldKeyholeLine, RiArrowRightSLine } from 'react-icons/ri';
import { HiHome } from 'react-icons/hi';

export default function Settings() {
  const context = useOutletContext();
  const location = useLocation();

  const isSecurity = location.pathname.includes('security');

  const navClass = ({ isActive }) => 
    `flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex-shrink-0 ${
      isActive 
        ? 'text-(--clr-primary) border-(--clr-primary)' 
        : 'text-gray-400 border-transparent hover:text-gray-600'
    }`;

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header /> 
      <section className='px-4 mt-30 lg:px-6 container-xl'>
        {/* breadcrumbs */}
        <nav className="flex items-center gap-2 mb-4 overflow-x-auto text-sm text-gray-500 whitespace-nowrap scrollbar-hide touch-pan-x">
          <Link to="/dashboard" className="flex items-center gap-1 hover:text-(--clr-primary) duration-300 ease-in-out shrink-0">
            <HiHome size={16} />
            <span>Dashboard</span>
          </Link>
          
          <RiArrowRightSLine size={16} className="text-gray-400 shrink-0" />
          
          <Link 
            to="/settings" 
            className={`hover:text-(--clr-primary) duration-300 ease-in-out shrink-0 ${!isSecurity ? 'font-bold text-gray-900' : ''}`}
          >
            Platform Settings
          </Link>

          {isSecurity && (
            <>
              <RiArrowRightSLine size={16} className="text-gray-400 shrink-0" />
              <span className="font-bold text-gray-900 shrink-0">Account Security</span>
            </>
          )}
        </nav>

        {/* tab */}
        <nav className="relative flex items-center w-full pb-px overflow-x-auto border-b border-gray-200 scrollbar-hide">
          <NavLink to="" end className={navClass}>
            <RiGlobalLine size={20} />
            General
          </NavLink>
          <NavLink to="security" className={navClass}>
            <RiShieldKeyholeLine size={20} />
            Security
          </NavLink>
        </nav>

        <main className="my-6 overflow-hidden bg-white border border-gray-300 rounded-xl">
          <Outlet context={context} />
        </main>
      </section>
    </div>
  );
}