import { useState, useEffect } from 'react';
import { useUser } from '../../../../hooks/useUser';
import { authFetch } from '../../../../utils/authFetch';
// components
import Header from '../../../../components/Header';
import DashboardCard from '../../../../components/DashboardCard';
import BranchPerformanceTable from '../components/BranchPerformanceTable'; 
import { BranchTopEarnersChart } from '../components/DashboardComponents';
// icons
import { TbUsers, TbCalendarTime } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { FiShoppingCart } from 'react-icons/fi';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';


const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicAdminDashboard() {
  const { user } = useUser();
  const [timeFilter, setTimeFilter] = useState('today');
  const [stats, setStats] = useState({
    total_branches: 0,
    total_staff: 0,
    today_appointments: 0,
    today_reservations: 0, 
    today_revenue: 0
  });
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClinicStats = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/dashboard/get-clinic-stat.php?filter=${timeFilter}`);
        
        if (res.success) {
          setStats(res.data.stats);
          setBranchPerformance(res.data.branches);
        } else {
          console.error("Failed to load stats:", res.message);
        }
      } catch (error) {
        console.error("Network error fetching stats", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinicStats();
  }, [timeFilter]);

  const dashboardCards = [
    {
      title: "Total Branches",
      data: stats.total_branches,
      icon: HiOutlineBuildingOffice2,
      iconColor: "text-gray-700"
    },
    {
      title: "Total Staff",
      data: stats.total_staff,
      icon: TbUsers,
      iconColor: "text-gray-700"
    },
    {
      title: timeFilter === 'today' ? "Appointments Today" : `Appointments (${timeFilter})`,
      data: stats.today_appointments,
      icon: TbCalendarTime,
      iconColor: "text-blue-600"
    },
    {
      title: timeFilter === 'today' ? "Reservations Today" : `Reservations (${timeFilter})`,
      data: stats.today_reservations || 0,
      icon: FiShoppingCart,
      iconColor: "text-purple-600"
    },
    {
      title: timeFilter === 'today' ? "Today's Revenue" : `Revenue (${timeFilter})`,
      data: `₱${(stats.today_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
      icon: RiMoneyDollarCircleLine,
      iconColor: "text-(--clr-primary)"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <section className='px-6 my-8 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user ? `Welcome, ${user.fname || 'Admin'}!` : "Clinic Branches Overview"}
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Monitor all branches, staff, and overall clinic performance.
            </p>
          </div>

          {/* TOP PAGE FILTER - DROPDOWN */}
          <div className="flex flex-col w-full gap-1 md:w-auto">
            <label className="text-[10px] font-black tracking-widest text-(--clr-text-primary) uppercase">
              Time Period
            </label>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="border border-gray-300 text-gray-700 text-sm font-bold rounded-lg focus:ring focus:ring-(--clr-primary) focus:border-(--clr-primary) block w-full md:w-48 px-4 py-2.5 outline-none cursor-pointer hover:border-gray-400 transition-all"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        <div className="space-y-8 duration-500 animate-in fade-in">
          
          {/* Row 1: The Big Numbers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {dashboardCards.map((stat, index) => (
              <DashboardCard key={index} {...stat} />
            ))}
          </div>

          {/* Row 2: Full Width Table (Primary Focus) */}
          <div className="w-full">
            <BranchPerformanceTable 
              data={branchPerformance} 
              isLoading={isLoading} 
              timeFilter={timeFilter} 
              onFilterChange={setTimeFilter} 
            />
          </div>

          {/* Row 3: Top Earners Chart (Secondary Visual) */}
          <div className="w-full">
            <BranchTopEarnersChart 
              data={branchPerformance} 
              isLoading={isLoading} 
              timeFilter={timeFilter} 
            />
          </div>

        </div>
      </section>
    </div>
  );
}