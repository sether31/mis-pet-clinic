import { useState, useEffect } from 'react';
import { useUser } from '../../../hooks/useUser';
import { authFetch } from '../../../utils/authFetch';
import Header from '../../../components/Header';
import DashboardCard from '../../../components/DashboardCard';

// You will need to duplicate/rename your subcomponents for the Super Admin perspective
import PlatformPerformanceTable from './components/PlatformPerformanceTable'; 
import { PlatformRevenueChart } from './components/DashboardComponents';
import PlatformLeaderboard from './components/PlatformLeaderboard';

// Icons
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { HiCalendar, HiDownload, HiOutlineInformationCircle } from "react-icons/hi";
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { IoDocumentTextOutline } from 'react-icons/io5';
import { PiWarning } from 'react-icons/pi';
import { MdOutlineSubscriptions } from 'react-icons/md';
import LoaderV2 from '../../../components/LoaderV2';


const API_URL = import.meta.env.VITE_API_URL;

export default function PlatformAnalytics() {
  const { user } = useUser();
  const [timeFilter, setTimeFilter] = useState('month'); // Defaulting to month is usually better for Super Admins
  
  // Adjusted state to match Super Admin metrics
  const [data, setData] = useState({
    stats: { 
      total_clinics: 0, 
      active_subscriptions: 0, 
      pending_applications: 0, 
      expiring_subscriptions: 0, 
      platform_revenue: 0 
    },
    clinics: [], 
    topSubscriptions: [], // Replaces topServices
    topRegions: []        // Replaces topProducts
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const res = await authFetch(`${API_URL}/api/super-admin/platform-analytics/get-platform-analytics.php?filter=${timeFilter}`);
        if (res.success) setData(res.data);
      } catch (error) {
        console.error("Error loading platform analytics", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeFilter]);

  // For Super Admins, a pending applications banner is more useful than a maintenance banner
  const hasPendingApplications = data.stats.pending_applications > 0;
  
  const dashboardCards = [
    { 
      title: "Total Registered Clinics", 
      data: data.stats.total_clinics, 
      icon: HiOutlineBuildingOffice2, 
      iconColor: "text-gray-700" 
    },
    { 
      title: "Active Subscriptions", 
      data: data.stats.active_subscriptions, 
      icon: MdOutlineSubscriptions, 
      iconColor: "text-(--clr-primary)" 
    },
    { 
      title: `Pending Approvals`, 
      data: data.stats.pending_applications, 
      icon: IoDocumentTextOutline, 
      iconColor: "text-amber-500" 
    },
    { 
      title: `Expiring Subs (7d)`, 
      data: data.stats.expiring_subscriptions, 
      icon: PiWarning, 
      iconColor: "text-red-500" 
    },
    { 
      title: `Platform Revenue (${timeFilter})`, 
      data: `₱${(data.stats.platform_revenue || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`, 
      icon: RiMoneyDollarCircleLine, 
      iconColor: "text-blue-600" 
    }
  ];

  const handleExportPDF = () => {
  if(!user?.id) {
    return;
  }
    
    // Changed "analytics" to "platform-analytics" to match your folder structure
    const url = `${API_URL}/api/super-admin/platform-analytics/generate-platform-analytics-pdf.php?period=${timeFilter}&user_id=${user.id}`;
    
    window.open(url, '_blank');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <section className='px-6 my-8 container-xl'>
        
        {/* Pending Applications Banner */}
        {hasPendingApplications && (
          <div className="flex items-center gap-3 p-4 mb-6 border bg-blue-50 border-blue-200 rounded-xl">
            <HiOutlineInformationCircle className="text-blue-600" size={24} />
            <p className="text-xs font-medium text-blue-800">
              You have <strong>{data.stats.pending_applications}</strong> pending clinic branch application(s) awaiting review.
            </p>
          </div>
        )}

        {/* Header Logic */}
        <div className="flex flex-col justify-between gap-4 mb-8 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Analytics Overview</h1>
            <p className="text-sm font-medium text-gray-500">Monitor platform growth, subscription renewals, and network revenue.</p>
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
                <option value="all">All Time</option>
              </select>
            </div>
            <button 
              onClick={handleExportPDF}
              className="px-4 py-1.5 flex gap-1 items-center bg-gray-900 hover:bg-black text-white rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Export PDF"
            >
              <HiDownload size={20} /> Generate PDF
            </button>
          </div>
        </div>

        {/* Analytics Content */}

        {isLoading ? (
          <LoaderV2 />
        ) : (
          <div className="space-y-8 duration-700 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Dashboard Cards (5 Grid Layout) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              {dashboardCards.map((stat, i) => <DashboardCard key={i} {...stat} />)}
            </div>

            {/* Network Leaderboard (Adapted for Subscriptions and Regions) */}
            <PlatformLeaderboard
              topSubscriptions={data.topSubscriptions} 
              topRegions={data.topRegions} 
              timeFilter={timeFilter}
            />

            <div className="grid grid-cols-1 gap-8">
              {/* Table replacing BranchPerformanceTable */}
              <PlatformPerformanceTable 
                data={data.clinics} 
                isLoading={isLoading} 
                timeFilter={timeFilter} 
              />
              {/* Chart replacing BranchTopEarnersChart */}
              <PlatformRevenueChart 
                data={data.clinics} 
                isLoading={isLoading} 
                timeFilter={timeFilter} 
              />
            </div>
            
          </div>
        )}
      </section>
    </div>
  );
}