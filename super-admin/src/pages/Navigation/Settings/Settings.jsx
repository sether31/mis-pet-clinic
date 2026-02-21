import { NavLink, Outlet, useOutletContext } from 'react-router-dom';
// components
import Header from '../../../components/Header';
// icons
import { RiGlobalLine, RiShieldKeyholeLine } from 'react-icons/ri';

export default function Settings() {
  const context = useOutletContext();

  const navClass = ({ isActive }) => 
    `flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex-shrink-0 ${
      isActive 
        ? 'text-(--clr-primary) border-(--clr-primary)' 
        : 'text-gray-400 border-transparent hover:text-gray-600'
    }`;

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />
      
      <section className='px-4 mt-6 lg:px-6 container-xl'>
        {/* header*/}
        <div className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight">Platform Settings</h1>
          <p className="text-gray-500">Manage platform configurations.</p>
        </div>

        {/* nav */}
        <nav className="relative flex items-center w-full overflow-x-auto border-b border-gray-200 scrollbar-hide pb-[1px]">
          <NavLink to="" end className={navClass}>
            <RiGlobalLine size={20} />
            General
          </NavLink>
          <NavLink to="security" className={navClass}>
            <RiShieldKeyholeLine size={20} />
            Security
          </NavLink>
        </nav>

        <main className="overflow-hidden border bg-white border-gray-300 my-6 rounded-xl">
          <Outlet context={context} />
        </main>
      </section>
    </div>
  );
}