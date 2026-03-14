import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '../../../../hooks/useUser';
import { authFetch } from '../../../../utils/authFetch';
import { toast } from 'react-toastify';
// components
import Header from '../../../../components/Header';
import LoaderV2 from '../../../../components/LoaderV2';
import DashboardCard from '../../../../components/DashboardCard';
import { UpcomingReservations, TodaysSchedule, WeeklyAppointment } from '../components/DashboardComponents';
// icons
import { TbAlertTriangle, TbCalendarTime, TbPaw } from 'react-icons/tb';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { FiShoppingCart } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL;

export default function VetDashboard() {
  const { user } = useUser();
  const { branchId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);

  // Check permissions for dynamic cards
  const hasInventoryPermission = user?.permissions?.includes('inventory_management'); 
  const hasShopPermission = user?.permissions?.includes('shop_management');

  const fetchVetData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/dashboard/get-vet-summary.php`);
      if (response.success) {
        setStats(response.data.stats);
        setUpcomingAppointments(response.data.appointments);
        setWeeklyData(response.data.weekly_trend); 
        setUpcomingReservations(response.data.upcoming_reservations || []);
      } else {
        toast.error("Failed to fetch dashboard data");
      }
    } catch (error) {
      toast.error("Connection error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVetData();
  }, [fetchVetData]);

  // cards
  const vetCards = [
    {
      title: "Today's Visits",
      data: stats?.today_appointments || "0",
      icon: TbCalendarTime,
      iconColor: "text-(--clr-text-primary)"
    },
    {
      title: "Total Patients",
      data: stats?.total_patients || "0",
      icon: TbPaw,
      iconColor: "text-blue-500"
    },
    {
      title: "Today's Revenue",
      data: stats?.today_billings ? `₱${Number(stats.today_billings).toLocaleString()}` : "₱0.00",
      icon: RiMoneyDollarCircleLine,
      iconColor: "text-(--clr-primary)"
    }
  ];

  if(hasInventoryPermission) {
    vetCards.push({ title: "Stock Alerts", data: stats?.stock_alerts || "0", icon: TbAlertTriangle, iconColor: "text-red-500" });
  }

  if(hasShopPermission) {
    vetCards.push({ title: "Pending Orders", data: stats?.pending_reservations || "0", icon: FiShoppingCart, iconColor: "text-purple-600" });
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <section className='px-6 my-8 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {user ? `Welcome, Dr. ${user?.lname || user?.fname}!` : "Welcome to the Portal"}
            </h1>
            <p className="text-sm font-medium text-gray-500">
              Monitor clinic performance and manage today's patient visits
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96"><LoaderV2 /></div>
        ) : (
          <div className="space-y-8 duration-500 animate-in fade-in">
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {vetCards.map((stat, index) => (
                <DashboardCard key={index} {...stat} />
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <TodaysSchedule 
                  appointments={upcomingAppointments} 
                  branchId={branchId} 
                />
              </div>

              <div className="flex flex-col gap-6">
                <WeeklyAppointment data={weeklyData} />
                
                {hasShopPermission && (
                  <UpcomingReservations 
                    reservations={upcomingReservations} 
                    branchId={branchId} 
                    isCompressed={true}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}