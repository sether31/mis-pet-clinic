import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Bar,
} from 'recharts';
import NoImage from '../../../../assets/images/no-image.jpg';
// icons
import { TbAlertCircle, TbBuildingHospital } from "react-icons/tb";
import { LuChevronRight, LuTrendingUp, LuBellRing } from "react-icons/lu";
import { IoDocumentTextOutline } from "react-icons/io5";

const API_URL = import.meta.env.VITE_API_URL;

// 1. Application Requests (Replaces Todays Schedule)
export const ApplicationRequests = ({ applications = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full min-h-[350px] p-6 bg-white border border-gray-300 rounded-2xl w-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300 shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
          <IoDocumentTextOutline className="text-lg text-(--clr-primary)" />
          Application Requests
        </h2>
        <button 
          onClick={() => navigate(`/clinic-applications`)} 
          className="text-xs font-bold text-gray-400 capitalize tracking-widest hover:text-(--clr-primary) cursor-pointer transition-colors"
        >
          Review All
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {applications.length > 0 ? (
          applications.map((app) => (
            <div 
              key={app.branch_id} 
              onClick={() => navigate(`/clinic-applications`, { state: { openBranchId: app.branch_id } })}
              className="group flex items-center justify-between p-3.5 border border-gray-300 bg-white rounded-2xl transition-all duration-300 cursor-pointer hover:border-(--clr-primary)"
            >
              <div className="flex items-center flex-1 min-w-0 gap-3">
                
                {/* Clinic Logo or Placeholder */}
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 border border-gray-200 shrink-0 rounded-xl overflow-hidden">
                  {app.logo_picture ? (
                    <img src={`${API_URL}/${app.logo_picture}`} alt="Logo" className="object-cover w-full h-full" />
                  ) : (
                    <TbBuildingHospital className="text-2xl text-gray-400" />
                  )}
                </div>
                
                <div className="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black leading-none tracking-tight text-gray-900 truncate">
                      {app.name}
                    </p>
                    <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest rounded uppercase border shrink-0 bg-green-50 text-(--clr-primary) border-green-200">
                      {app.status}
                    </span>
                  </div>
                  
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
                    {app.municipality}, {app.province}
                  </p>

                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate">
                    Submitted: {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center w-7 h-7 rounded-lg duration-300 shrink-0 ml-2 bg-gray-900 group-hover:bg-(--clr-primary)">
                <LuChevronRight size={14} className="text-white" />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center rounded-2xl bg-gray-50/50">
            <div className="relative mb-3">
              <div className="absolute inset-0 scale-150 rounded-full bg-amber-50 blur-lg" />
              <IoDocumentTextOutline className="relative text-4xl text-gray-300" />
            </div>
            <p className="text-xs font-black tracking-widest text-gray-400 uppercase">All Caught Up</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tight">No pending applications.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Notification Overview (Replaces Upcoming Reservations)
export const NotificationOverview = ({ notifications = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full min-h-[350px] p-6 bg-white border border-gray-300 rounded-2xl w-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300 shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
          <LuBellRing className="text-lg text-blue-600" />
          System Notifications
        </h2>
        <button 
          onClick={() => navigate(`/notifications`)}
          className="text-xs font-bold text-gray-400 capitalize tracking-widest hover:text-blue-600 cursor-pointer transition-colors"
        >
          View All
        </button>
      </div>
      
      <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {notifications.length > 0 ? (
          notifications.map((notification, index) => {
            // Check if the notification is read (mapping from your isRead bool in PHP)
            const isRead = notification.isRead; 

            return (
              <div 
                key={index}
                onClick={() => navigate('/notifications', { state: { highlightId: notification.notification_id }})}
                className={`group flex items-center justify-between p-3 transition-all border rounded-xl cursor-pointer active:scale-[0.98] ${
                  isRead 
                    ? 'bg-gray-50 border-gray-200 opacity-60' 
                    : 'bg-white border-blue-100 hover:border-blue-300' 
                }`}
              >
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  {/* Icon color also fades if read */}
                  <div className={`p-2 rounded-lg shrink-0 ${
                    isRead ? 'bg-gray-200 text-gray-500' : 
                    notification.type === 'alert' ? 'bg-red-100 text-red-600' : 
                    notification.type === 'success' ? 'bg-green-100 text-green-600' : 
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <TbAlertCircle size={20} />
                  </div>

                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <p className={`text-xs font-black uppercase truncate ${isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                      {notification.title}
                    </p>
                    <p className="text-[10px] font-medium text-gray-500 truncate mt-0.5">
                      {notification.message} 
                    </p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                      {notification.time_ago}
                    </p>
                  </div>
                </div>

                {/* Chevron Icon - matches the Clinic Application style */}
                <div className="flex items-center justify-center w-7 h-7 rounded-lg duration-300 shrink-0 ml-2 bg-gray-900 group-hover:bg-blue-600">
                  <LuChevronRight size={14} className="text-white" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-gray-50/50">
            <LuBellRing className="text-4xl text-gray-300 mb-2" />
            <p className="text-xs font-black text-gray-400 uppercase">System Quiet</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 3. Platform Top Earners Chart (Replaces ClinicTopEarnersChart)
export const PlatformTopEarnersChart = ({ data = [], isLoading, timeFilter }) => {
  const chartData = [...data]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .map(branch => ({
      id: branch.branch_id, 
      name: branch.name,
      Revenue: parseFloat(branch.revenue)
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const toolData = payload[0].payload; 
      return (
        <div className="px-3 py-2 text-[10px] font-black tracking-widest text-center text-white uppercase bg-gray-900 rounded-lg border border-gray-700 pointer-events-none z-50">
          <p className="pb-1 mb-1 border-b border-gray-700">{toolData.name}</p>
          <p className="text-green-400">
            ₱{Number(toolData.Revenue).toLocaleString(undefined, { 
              minimumFractionDigits: 2,
              maximumFractionDigits: 2 
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full min-h-[400px] p-6 bg-white border border-gray-300 rounded-2xl w-full duration-300">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300 shrink-0">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
            <LuTrendingUp className="text-green-600 text-lg" />
            Top 10 Clinics by Revenue
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Platform Performers ({timeFilter})
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Analytics...</span>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <LuTrendingUp className="mb-1 text-3xl text-gray-300" />
            <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">No data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart 
              key={`chart-${timeFilter}`} 
              data={chartData} 
              margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={1} /> {/* green-600 */}
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#1f1f1f', fontSize: 10, fontWeight: 900 }}
                dy={10}
                tickFormatter={(val) => val.length > 12 ? val.substring(0, 10) + '..' : val}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#1f1f1f', fontSize: 10, fontWeight: 900 }}
                tickFormatter={(v) => `₱${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#f8fafc', radius: 6 }}
                wrapperStyle={{ pointerEvents: 'none', zIndex: 1000 }}
              />
              
              <Area type="monotone" dataKey="Revenue" fill="url(#lineAreaGradient)" stroke="none" />
              <Line type="monotone" dataKey="Revenue" stroke="#16a34a" strokeWidth={2} dot={false} opacity={0.3} />

              <Bar dataKey="Revenue" radius={[6, 6, 0, 0]} barSize={35}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`bar-${entry.id}`} 
                    fill={index === 0 ? "url(#barGradient)" : "#e2e8f0"} 
                    className="transition-all duration-500 hover:brightness-95"
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};