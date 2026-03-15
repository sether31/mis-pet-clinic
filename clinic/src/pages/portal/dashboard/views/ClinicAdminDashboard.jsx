import { useState, useEffect } from 'react';
import { HiOfficeBuilding, HiUsers, HiCurrencyDollar, HiCalendar } from 'react-icons/hi';
import { authFetch } from '../../../../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicAdminDashboard() {
  const [stats, setStats] = useState({
    total_branches: 0,
    total_staff: 0,
    today_appointments: 0,
    today_revenue: 0
  });
  const [branchPerformance, setBranchPerformance] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Wire this up to your actual PHP endpoint later!
    const fetchClinicStats = async () => {
      try {
        // const res = await authFetch(`${API_URL}/api/clinic/admin/get-clinic-stats.php`);
        // if(res.success) {
        //   setStats(res.data.stats);
        //   setBranchPerformance(res.data.branches);
        // }
        
        // Mock data so you can see the UI immediately
        setTimeout(() => {
          setStats({
            total_branches: 3,
            total_staff: 24,
            today_appointments: 42,
            today_revenue: 15400.00
          });
          setBranchPerformance([
            { id: 1, name: 'Main City Branch', appts: 20, revenue: 8500, status: 'Active' },
            { id: 2, name: 'Southside Clinic', appts: 15, revenue: 5200, status: 'Active' },
            { id: 3, name: 'Westend Grooming', appts: 7, revenue: 1700, status: 'Active' },
          ]);
          setIsLoading(false);
        }, 800);

      } catch (error) {
        console.error("Failed to load stats", error);
        setIsLoading(false);
      }
    };

    fetchClinicStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass }) => (
    <div className="flex items-center p-6 bg-white border border-gray-200 shadow-sm rounded-2xl">
      <div className={`p-4 rounded-xl ${colorClass}`}>
        <Icon size={28} />
      </div>
      <div className="ml-5">
        <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">{title}</p>
        <p className="text-2xl font-black text-gray-800">{isLoading ? '...' : value}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full gap-6 p-6 overflow-y-auto bg-gray-50">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">Headquarters Overview</h1>
        <p className="text-sm font-medium text-gray-500">Monitor all branches, staff, and overall clinic performance.</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Branches" 
          value={stats.total_branches} 
          icon={HiOfficeBuilding} 
          colorClass="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          title="Total Staff" 
          value={stats.total_staff} 
          icon={HiUsers} 
          colorClass="bg-purple-50 text-purple-600" 
        />
        <StatCard 
          title="Appointments Today" 
          value={stats.today_appointments} 
          icon={HiCalendar} 
          colorClass="bg-green-50 text-green-600" 
        />
        <StatCard 
          title="Today's Revenue" 
          value={`₱${stats.today_revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
          icon={HiCurrencyDollar} 
          colorClass="bg-amber-50 text-amber-600" 
        />
      </div>

      {/* Branch Performance Table */}
      <div className="flex flex-col overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-black tracking-tight text-gray-800 uppercase">Branch Performance (Today)</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4">Branch Name</th>
                <th className="px-6 py-4 text-center">Appointments</th>
                <th className="px-6 py-4 text-center">Revenue</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400 font-medium">Loading performance data...</td>
                </tr>
              ) : branchPerformance.map((branch) => (
                <tr key={branch.id} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-bold text-gray-800">{branch.name}</td>
                  <td className="px-6 py-4 font-medium text-center text-gray-600">{branch.appts}</td>
                  <td className="px-6 py-4 font-black text-center text-green-600">
                    ₱{branch.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-3 py-1 text-[10px] font-black tracking-wide text-green-700 uppercase bg-green-100 rounded-full">
                      {branch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}