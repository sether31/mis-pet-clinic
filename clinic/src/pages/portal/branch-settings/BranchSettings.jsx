import { NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom';
// components
import Header from '../../../components/Header';
// icons
import { HiBuildingOffice2, HiCreditCard, HiCalendarDays } from "react-icons/hi2"; 

export default function BranchSettings() {
  const { branchId } = useParams();
  const context = useOutletContext();

  const navClass = ({ isActive }) => 
    `flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all duration-200 border-b-2 whitespace-nowrap flex-shrink-0 ${
      isActive 
        ? 'text-(--clr-primary) border-(--clr-primary)' 
        : 'text-gray-400 border-transparent hover:text-gray-600'
    }`;

  return (
    <div className="bg-(--clr-bg-page) min-h-screen">
      <Header />
      <section className='px-4 mt-6 lg:px-6 container-xl'>
        <nav className="relative flex items-center w-full overflow-x-auto border-b border-gray-200 scrollbar-hide pb-[1px]">
          <NavLink to="" end className={navClass}>
            <HiBuildingOffice2 size={18} />
            General
          </NavLink>
          <NavLink to={`/clinic/${branchId}/portal/branch-settings/schedule`} className={navClass}>
            <HiCalendarDays size={18} />
            Schedule
          </NavLink>
          <NavLink to={`/clinic/${branchId}/portal/branch-settings/subscription`} className={navClass}>
            <HiCreditCard size={18} />
            Subscription
          </NavLink>
        </nav>

        <main className="p-4 my-6 bg-white border border-gray-300 shadow-sm lg:p-6 rounded-xl">
          <Outlet context={context} />
        </main>
      </section>
    </div>
  );
}