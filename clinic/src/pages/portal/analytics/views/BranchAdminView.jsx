import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  HiCalendar, HiDownload, HiOutlinePresentationChartBar, HiOutlineChartBar, HiOutlineTrendingUp,
  HiOutlineClipboardList
} from 'react-icons/hi';

import { authFetch } from "../../../../utils/authFetch"; 
import { useUser } from "../../../../hooks/useUser"; 
import LoaderV2 from "../../../../components/LoaderV2";
import Header from '../../../../components/Header';
import DashboardCard from '../../../../components/DashboardCard'; 
import { LuPackage, LuStethoscope, LuWallet } from 'react-icons/lu';
import { FiShoppingCart } from 'react-icons/fi';
import { PiWarning } from 'react-icons/pi';
import { TbCalendarCheck } from 'react-icons/tb';

const API_URL = import.meta.env.VITE_API_URL;
const CATEGORY_COLORS = {
  'Services': 'var(--clr-primary)', 
  'Products': '#9333ea'             
};

const STATUS_COLORS = {
  'Out of Stock': '#ef4444', // Red
  'Low Stock': '#f59e0b',    // Amber
  'Expired': '#dc2626',      // Dark Red
  'Expiring Soon': '#fbbf24' // Yellow
};

export default function BranchAdminView() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('week'); 
  const [data, setData] = useState({
    cardData: { 
        revenue: 0, 
        pendingRevenue: 0, 
        productsSold: 0, 
        appointments: 0, 
        completedReservations: 0 // Match PHP key
    },
    revenueTrend: [],
    topServices: [],
    topProducts: [],
    revenueBreakdown: [],
    inventoryStatus: [], // For Low Stock vs Out of Stock
    expiryStatus: [],
  });

  // Helper to format the filter name for the card titles
  const getFilterLabel = (filter) => {
    const labels = {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year'
    };
    return labels[filter] || filter;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.branch_id) return;
      setLoading(true);
      const endpoint = `${API_URL}/api/clinic/general/analytics/get-branch-admin-analytics.php?branch_id=${user.branch_id}&period=${timeFilter}`;
      const result = await authFetch(endpoint);
      if (result.success) {
        setData(result.data);
      }
      setLoading(false);
    };
    fetchAnalytics();
  }, [user?.branch_id, timeFilter]);

  const pieData = data.revenueBreakdown.map(item => ({
    ...item,
    value: parseFloat(item.value) || 0
  })).filter(item => item.value > 0);

  const handleExportPDF = () => {
    const branchName = user?.branch_name || 'Branch';
    const url = `${API_URL}/api/clinic/general/analytics/generate-branch-admin-analytics-pdf.php?branch_id=${user.branch_id}&period=${timeFilter}&branch_name=${encodeURIComponent(branchName)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />

      <section className="w-full px-6 my-6 container-xl">
        
        {/* TOP ACTION BAR */}
        <div className="flex flex-col items-start justify-between mb-8 gap-y-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Branch Performance Overview</h1>
            <p className="text-gray-500 text-sm">Monitor real-time activity and download branch reports.</p>
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
              className="px-4 py-1.5 flex gap-1 items-center bg-(--clr-text-primary) hover:bg-black text-white  rounded-lg active:scale-95 transition-all cursor-pointer"
              title="Export PDF"
            >
              <HiDownload size={20} /> Generate PDF
            </button>
          </div>
        </div>

        {loading ? (
          <LoaderV2 />
        ) : (
          <>
            {/* KPI GRID */}
            <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <DashboardCard 
                title={`Total Revenue (${getFilterLabel(timeFilter)})`} 
                data={`₱${Number(data.cardData.revenue).toLocaleString()}`} 
                icon={LuWallet} 
                iconColor="text-black"
              />
              <DashboardCard 
                title={`Pending Revenue (${getFilterLabel(timeFilter)})`} 
                data={`₱${Number(data.cardData.pendingRevenue).toLocaleString()}`} 
                icon={PiWarning} 
                iconColor="text-yellow-600"
              />
              <DashboardCard 
                title={`Appointments (${getFilterLabel(timeFilter)})`} 
                data={
                  <>
                    {data.cardData.appointments}
                    {data.cardData.pendingAppointments > 0 && (
                      <span className="ml-2 text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold animate-pulse inline-block align-middle">
                        {data.cardData.pendingAppointments} Pending
                      </span>
                    )}
                  </>
                } 
                icon={LuStethoscope} 
                iconColor="text-blue-600"
              />

              <DashboardCard 
                title={`Completed Reservations (${getFilterLabel(timeFilter)})`} 
                data={data.cardData.completedReservations} 
                icon={TbCalendarCheck} 
                iconColor="text-(--clr-primary)" 
              />

              <DashboardCard 
                title={`Products Sales (${getFilterLabel(timeFilter)})`} 
                data={data.cardData.productsSold} 
                icon={FiShoppingCart} 
                iconColor="text-purple-600"
              />

              <DashboardCard 
                  title="Inventory Stock Alerts" 
                  data={
                    <div className="flex items-baseline gap-2">
                      <span className="text-red-600" title="Out of Stock">
                        {data.inventoryStatus.find(i => i.category === 'Out of Stock')?.count || 0}
                      </span>
                      <span className="text-gray-300 text-lg">/</span>
                      <span className="text-amber-500 text-sm font-medium" title="Low Stock">
                        {data.inventoryStatus.find(i => i.category === 'Low Stock')?.count || 0} Low
                      </span>
                    </div>
                  } 
                  icon={LuPackage} 
                  iconColor="text-red-600"
                />

                {/* CARD 7: Expiry Alerts */}
                <DashboardCard 
                  title="Inventory Expiry Alerts" 
                  data={
                    <div className="flex items-baseline gap-2">
                      <span className="text-red-700" title="Expired">
                        {data.expiryStatus.find(i => i.name === 'Expired')?.value || 0}
                      </span>
                      <span className="text-gray-300 text-lg">/</span>
                      <span className="text-yellow-500 text-sm font-medium" title="Expiring Soon">
                        {data.expiryStatus.find(i => i.name === 'Expiring Soon')?.value || 0} Soon
                      </span>
                    </div>
                  } 
                  icon={PiWarning} 
                  iconColor="text-orange-600"
                />
            </div>

            {/* MAIN CHARTS GRID */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              
              <ChartContainer 
                title={`Revenue Trend (${getFilterLabel(timeFilter)})`} 
                icon={HiOutlineTrendingUp}
                iconColor="text-blue-600"
                isEmpty={data.revenueTrend.length === 0}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => `₱${val}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer 
                title={`Top 5 Booked Services (${getFilterLabel(timeFilter)})`} 
                icon={HiOutlineClipboardList}
                iconColor="text-(--clr-primary)"
                isEmpty={data.topServices.length === 0}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topServices} layout="vertical" margin={{ left: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} width={120} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" fill="#42756C" radius={[0, 6, 6, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer 
                title={`Top 5 Best-Selling Products (${getFilterLabel(timeFilter)})`} 
                icon={LuPackage}
                iconColor="text-purple-600"
                isEmpty={data.topProducts.length === 0}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topProducts}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="sales" fill="#9333ea" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              <ChartContainer 
                title={`Revenue Category (${getFilterLabel(timeFilter)})`} 
                icon={HiOutlineChartBar}
                iconColor="text-(--clr-primary)" 
                isEmpty={pieData.length === 0}
              >
                <div className="flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={70} 
                        outerRadius={95}
                        paddingAngle={8} 
                        dataKey="value" 
                        nameKey="category"
                      >
                        {pieData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={CATEGORY_COLORS[entry.category] || '#cbd5e1'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>

              <ChartContainer 
                title="Inventory needing Restock" 
                icon={LuPackage}
                iconColor="text-red-600"
                isEmpty={data.inventoryStatus.every(item => item.count === 0)}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.inventoryStatus}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="category" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#fef2f2' }} />
                    <Bar dataKey="count">
                      {data.inventoryStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.category]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>

              {/* NEW: EXPIRY MONITOR (Pie Chart) */}
              <ChartContainer 
                title="Inventory Expiry Status (Next 30 Days)" 
                icon={PiWarning}
                iconColor="text-orange-500"
                isEmpty={data.expiryStatus.every(item => item.value === 0)}
              >
                <div className="flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.expiryStatus}
                        innerRadius={70} 
                        outerRadius={95}
                        paddingAngle={8} 
                        dataKey="value" 
                        nameKey="name"
                      >
                        {data.expiryStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartContainer>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function ChartContainer({ title, children, isEmpty, icon: Icon, iconColor = "text-gray-400" }) {
  return (
    <div className="p-6 bg-white border-2 border-gray-300 rounded-2xl min-h-[400px] flex flex-col">
      {/* Header with Icon */}
      <div className="flex items-center gap-2 pb-4 mb-6 border-b border-gray-200">
        {Icon && <Icon className={iconColor} size={22} />} 
        <h3 className="text-sm font-bold tracking-tight text-gray-700 uppercase">
          {title}
        </h3>
      </div>
      
      {/* Chart Body */}
      <div className="relative flex-grow">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="p-4 mb-3 rounded-full bg-gray-50">
              <HiOutlinePresentationChartBar className="text-gray-300" size={40} />
            </div>
            <p className="text-sm font-medium text-gray-400">No data available</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}