import { useEffect, useState } from 'react'; 
// hooks
import { useUser } from '../../../hooks/useUser';
// utils 
import { authFetch } from '../../../utils/authFetch'; 
// components
import Header from '../../../components/Header';
import DashboardCard from '../../../components/DashboardCard';
import LoaderV2 from '../../../components/LoaderV2';
// icons
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { HiCalendar, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdOutlineSubscriptions } from "react-icons/md";
// sub omponents
import { 
  ApplicationRequests, 
  NotificationOverview, 
  PlatformTopEarnersChart 
} from './components/DashboardComponents';

export default function SuperAdminDashboard() {
  const { user } = useUser();
  const [timeFilter, setTimeFilter] = useState('month'); 
  
  // Updated state for platform-wide stats
  const [stats, setStats] = useState({
    total_approved_clinics: 0,
    pending_applications: 0,
    total_subscribed_clinics: 0, 
    total_active_subscribed_clinics: 0,
    platform_revenue: 0
  });
  
  const [platformData, setPlatformData] = useState({
    applications: [],
    notifications: [],
    topEarners: []
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSuperAdminData = async () => {
      try {
        setIsLoading(true);
        // 2. Fetch Dashboard Stats (You will need to create this endpoint)
        const response = await authFetch(`${import.meta.env.VITE_API_URL}/api/super-admin/dashboard/get-overview.php?filter=${timeFilter}`);
        
        if (response.success) {
          setStats(response.data.stats);
          setPlatformData({
            applications: response.data.applications || [],
            notifications: response.data.notifications || [],
            topEarners: response.data.topEarners || []
          });
        }
      } catch (err) {
        console.error("Failed to load super admin data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'super_admin') {
      fetchSuperAdminData();
    }
  }, [user, timeFilter]);

  const dashboardCards = [
    {
      title: "Total approved clinics",
      data: stats?.total_approved_clinics || "0",
      icon: HiOutlineBuildingOffice2,
      iconColor: "text-gray-800"
    },
    {
      title: "Pending Applications",
      data: stats?.pending_applications || "0",
      icon: IoDocumentTextOutline,
      iconColor: "text-amber-500"
    },
    {
      title: "Total subscribed clinics",
      data: stats?.total_subscribed_clinics || "0",
      icon: MdOutlineSubscriptions,
      iconColor: "text-purple-600"
    },
    {
      title: "Total active subscribe clinics",
      data: stats?.total_active_subscribed_clinics || "0",
      icon: HiOutlineBuildingOffice2,
      iconColor: "text-(--clr-primary)"
    },
    {
      title: `Platform Revenue (${timeFilter})`,
      data: stats?.platform_revenue ? `₱${Number(stats.platform_revenue).toLocaleString()}` : `₱0.00`,
      icon: RiMoneyDollarCircleLine,
      iconColor: "text-(--clr-primary)"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <section className='px-6 my-6 container-xl'>     
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user ? `Welcome, ${user.fname || 'Super Admin'}!` : "Platform Overview"}
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Monitor clinic applications, platform revenue, and system alerts.
            </p>
          </div>

          {/* TOP PAGE FILTER */}
          <div className="relative inline-block w-full md:w-48">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-(--clr-primary) pointer-events-none">
              <HiCalendar size={18} />
            </div>
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="block w-full py-2 pl-10 pr-4 text-sm font-medium text-gray-700 border border-gray-400 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring focus:ring-gray-700"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <LoaderV2 />
        ) : (
          <div className="space-y-8 duration-500 animate-in fade-in">
            
            {/* Row 1: The Big Numbers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {dashboardCards.map((stat, index) => (
                <DashboardCard key={index} {...stat} />
              ))}
            </div>

            {/* Row 2: Applications & Notifications */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ApplicationRequests applications={platformData.applications} />
              <NotificationOverview notifications={platformData.notifications} />
            </div>

            {/* Row 3: Top Earners Chart */}
            <div className="w-full">
              <PlatformTopEarnersChart 
                data={platformData.topEarners} 
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