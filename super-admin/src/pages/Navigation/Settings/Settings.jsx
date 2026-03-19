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
      <section className='px-4 my-6 lg:px-6 container-xl'>
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