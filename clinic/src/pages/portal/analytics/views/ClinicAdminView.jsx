import { useState, useEffect } from 'react';
import { useUser } from '../../../../hooks/useUser';
import { authFetch } from '../../../../utils/authFetch';
import Header from '../../../../components/Header';
import DashboardCard from '../../../../components/DashboardCard';
import BranchPerformanceTable from '../components/BranchPerformanceTable'; 
import { BranchTopEarnersChart } from '../components/DashboardComponents';
import { TbUsers, TbCalendarTime } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { HiCalendar, HiDownload, HiOutlineInformationCircle } from "react-icons/hi";
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import NetworkLeaderboard from '../components/NetworkLeaderBoard';
import { FiShoppingCart } from 'react-icons/fi';
import { PiWarning } from 'react-icons/pi';

const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicAdminAnalytics() {
  const { user } = useUser();
  const [timeFilter, setTimeFilter] = useState('today');
  const [data, setData] = useState({
    stats: { total_branches: 0, total_staff: 0, today_appointments: 0, total_product_sales: 0, today_revenue: 0 },
    branches: [], topServices: [], // Add this
    topProducts: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/clinic/general/analytics/get-clinic-admin-analytics.php?filter=${timeFilter}`);
        if (res.success) setData(res.data);
      } catch (error) {
        console.error("Error loading analytics", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeFilter]);

  const maintenanceBranches = data.branches.filter(b => b.status === 'Maintenance');
  
  const dashboardCards = [
    { title: "Clinic Branches", data: data.stats.total_branches, icon: HiOutlineBuildingOffice2, iconColor: "text-gray-700" },
    { title: "Active Staff", data: data.stats.total_staff, icon: TbUsers, iconColor: "text-gray-700" },
    { 
      title: `Appointments (${timeFilter})`, 
      data: data.stats.today_appointments, 
      icon: TbCalendarTime, 
      iconColor: "text-blue-600" 
    },
    { 
      title: `Product Sales (${timeFilter})`, 
      data: `${data.stats.total_product_sales}`, 
      icon: FiShoppingCart, 
      iconColor: "text-purple-600" 
    },
    { 
      title: `Pending Revenue (${timeFilter})`, 
      data: `₱${(data.stats.pending_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 
      icon: PiWarning, 
      iconColor: "text-yellow-500" 
    },
    { 
      title: `Revenue (${timeFilter})`, 
      data: `₱${(data.stats.today_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 
      icon: RiMoneyDollarCircleLine, 
      iconColor: "text-(--clr-primary)" 
    }
  ];
const handleExportPDF = () => {
  if (!user?.user_id) return;

  // Added user_id to the query parameters
  const url = `${API_URL}/api/clinic/general/analytics/generate-clinic-admin-analytics-pdf.php?period=${timeFilter}&user_id=${user.user_id}`;
  
  window.open(url, '_blank');
};

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className='px-6 my-8 container-xl'>
        
        {/* Maintenance Banner */}
        {maintenanceBranches.length > 0 && (
          <div className="flex items-center gap-3 p-4 mb-6 border bg-amber-50 border-amber-200 rounded-xl">
            <HiOutlineInformationCircle className="text-amber-600" size={24} />
            <p className="text-xs text-amber-800 font-medium">
              <strong>{maintenanceBranches.length}</strong> branch(es) are currently in maintenance mode and hidden from public booking.
            </p>
          </div>
        )}

        {/* Header Logic */}
        <div className="flex flex-col justify-between gap-4 mb-8 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Executive Analytics Overview</h1>
            <p className="text-sm font-medium text-gray-500">Monitor performance across all active clinic branches and download branch reports.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative inline-block w-48">
              <HiCalendar className="absolute text-(--clr-primary) -translate-y-1/2 left-3 top-1/2" size={18} />
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="block w-full py-2 pl-10 pr-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring focus:ring-gray-400"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
            <button 
              onClick={handleExportPDF}
              className="px-4 py-1.5 flex gap-1 items-center bg-(--clr-text-primary) hover:bg-black text-white  rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Export PDF"
            >
              <HiDownload size={20} /> Generate PDF
            </button>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {dashboardCards.map((stat, i) => <DashboardCard key={i} {...stat} />)}
          </div>

          <NetworkLeaderboard
            services={data.topServices} 
            products={data.topProducts} 
            timeFilter={timeFilter}
          />

          <div className="grid grid-cols-1 gap-8">
            <BranchPerformanceTable data={data.branches} isLoading={isLoading} timeFilter={timeFilter} />
            <BranchTopEarnersChart data={data.branches} isLoading={isLoading} timeFilter={timeFilter} />
          </div>
        </div>
      </section>
    </div>
  );
}