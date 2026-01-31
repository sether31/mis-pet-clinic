import { NavLink, Outlet, useParams } from 'react-router-dom';
import { HiOutlineBuildingOffice2, HiOutlineCreditCard, HiOutlineCalendarDays } from "react-icons/hi2";
import Header from '../../../components/Header';

export default function BranchSettings() {
  const { branchId } = useParams();

  const navClass = ({ isActive }) => 
    `flex items-center gap-2 px-6 py-4 font-medium transition-all duration-200 border-b-2 ${
      isActive 
        ? 'text-(--clr-primary) border-(--clr-primary)' 
        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="bg-(--clr-bg-page) min-h-screen">
      <Header />
      <section className='px-4 text-sm md:text-base lg:px-6 mt-6 container-xl'>
        <nav className="flex gap-4 overflow-x-auto">
          <NavLink to="" end className={navClass}>
            <HiOutlineBuildingOffice2 size={20} />
            General
          </NavLink>
          <NavLink to={`/clinic/${branchId}/portal/branch-settings/schedule`} className={navClass}>
            <HiOutlineCalendarDays size={20} />
            Schedule
          </NavLink>
          <NavLink to={`/clinic/${branchId}/portal/branch-settings/subscription`} className={navClass}>
            <HiOutlineCreditCard size={20} />
            Subscription
          </NavLink>
        </nav>

        
        <main className="p-4 lg:p-6 my-6 border border-gray-300 rounded-xl">
          <Outlet /> 
        </main>
      </section>
    </div>
  );
}