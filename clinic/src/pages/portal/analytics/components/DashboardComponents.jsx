import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Bar,
} from 'recharts';
// image
import NoImage from '../../../../assets/images/no-image.jpg';
// icons
import { TbCalendarTime, TbClockHour4, TbShoppingCartOff } from "react-icons/tb";
import { LuChevronRight, LuTrendingUp } from "react-icons/lu";
import { FiShoppingCart } from 'react-icons/fi';
import LoaderV2 from '../../../../components/LoaderV2';

const API_URL = import.meta.env.VITE_API_URL;

// weekly appointment graph
export const WeeklyAppointment = ({ data }) => {
  const CustomTooltip = ({ active, payload }) => {
    if(active && payload && payload.length) {
      return (
        <div className="px-3 py-2 text-[10px] font-black tracking-widest text-center text-white uppercase bg-gray-900 rounded-lg">
          <p className="pb-1 mb-1 border-b border-gray-700">{payload[0].payload.day}</p>
          <p className="text-(--clr-primary)">{payload[0].value} Visits</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full p-6 bg-white border border-gray-300 rounded-2xl">
      <h2 className="flex items-center justify-between pb-4 mb-2 text-sm font-black tracking-wider text-gray-800 uppercase border-b border-gray-300">
        <span className="flex items-center gap-2">
          <LuTrendingUp className="text-lg text-(--clr-primary)" /> 
          Weekly Workload
        </span>
        <span className="text-[10px] text-gray-700 font-bold">This Week</span>
      </h2>

      <div className="flex-grow w-full h-full min-h-[250px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--clr-primary)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--clr-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            {/* Horizontal Grid Lines */}
            <CartesianGrid 
              vertical={false} 
              strokeDasharray="3 3" 
              stroke="#e2e8f0" 
            />

            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#1f1f1f', fontSize: 10, fontWeight: 900 }} 
              dy={10} 
            />

            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#1f1f1f', fontSize: 10, fontWeight: 900 }} 
            />

            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ stroke: 'var(--clr-primary)', strokeWidth: 1, strokeDasharray: '4 4' }} 
            />

            {/* The Area Fill */}
            <Area
              type="monotone"
              dataKey="appointments"
              stroke="var(--clr-primary)"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorAppts)"
              activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--clr-primary)' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Insight */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
        <p className="text-[10px] font-black text-gray-700 uppercase">Avg. Daily: 
          <span className="ml-1 text-gray-900">
            {(data.reduce((acc, curr) => acc + curr.appointments, 0) / 7).toFixed(1)}
          </span>
        </p>
      </div>
    </div>
  );
};


// todays sched component
export const TodaysSchedule = ({ appointments, branchId }) => {
  const navigate = useNavigate();
  const now = new Date();

  const renderPetAvatar = (pictureUrl, petName) => {
    return (
      <div className="flex-shrink-0 w-14 h-14 overflow-hidden border border-gray-300 rounded-xl bg-[#d1fae5] flex items-center justify-center">
        <img 
          src={pictureUrl 
            ? `${API_URL}/${pictureUrl}` 
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(petName || 'Pet')}&background=d1fae5&color=42756C&bold=true`
          } 
          alt="Pet" 
          className="object-cover w-full h-full"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(petName || 'Pet')}&background=d1fae5&color=42756C&bold=true`;
          }}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-[350px] p-6 bg-white border border-gray-300 rounded-2xl w-full">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300 shrink-0">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
          <TbCalendarTime className="text-lg" />
          Today's Schedule
        </h2>
        <button 
          onClick={() => navigate(`/clinic/${branchId}/portal/appointment-management`)} 
          className="text-xs font-bold text-gray-400 capitalize tracking-widest hover:text-(--clr-primary) cursor-pointer"
        >
          View all
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 custom-scrollbar">
        {appointments.length > 0 ? (
          appointments.map((appt) => {
            
            const isOverdue = appt.end_time 
              ? new Date(appt.end_time) < now && ['pending', 'confirmed'].includes(appt.appointment_status)
              : false;

            return (
              <div 
                key={appt.appointment_id} 
                onClick={() => navigate(`/clinic/${branchId}/portal/appointment-management?view=${appt.appointment_id}`)} 
                className={`group flex items-center justify-between p-3.5 border rounded-2xl transition-all duration-300 cursor-pointer ${
                  isOverdue ? 'border-red-200 bg-red-50/30 hover:border-red-400' : 'bg-white border-gray-300 hover:border-(--clr-primary)'
                }`}
              >
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  
                  {renderPetAvatar(appt.pet_picture)}   
                  
                  <div className="flex flex-col justify-center flex-1 min-w-0 gap-0.5">
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-black leading-none tracking-tight truncate ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                        {appt.pet_name || 'No Name'}
                      </p>
                      
                      {isOverdue ? (
                        <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest rounded uppercase border shrink-0 bg-red-50 text-red-600 border-red-200">
                          OVERDUE: {appt.appointment_status}
                        </span>
                      ) : (
                        <span className={`px-1.5 py-0.5 text-[8px] font-black tracking-widest rounded uppercase border shrink-0 ${
                          appt.appointment_status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-green-50 text-(--clr-primary) border-green-200'
                        }`}>
                          {appt.appointment_status}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">
                      {appt.owner_name}
                    </p>

                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest truncate">
                      {appt.service_type}
                    </p>

                    <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5 ${
                      isOverdue ? 'text-red-500' : 'text-blue-500'
                    }`}>
                      <TbClockHour4 className="text-[10px] shrink-0" />
                      <span className="truncate">{appt.start_time_formatted} - {appt.end_time_formatted}</span>
                    </p>
                    
                  </div>
                </div>
                
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg duration-300 shrink-0 ml-2 ${
                  isOverdue ? 'bg-red-500 group-hover:bg-red-600' : 'bg-black group-hover:bg-(--clr-primary)'
                }`}>
                  <LuChevronRight size={14} className="text-white" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center rounded-2xl bg-gray-50/50">
            <div className="relative mb-3">
              <div className="absolute inset-0 scale-150 rounded-full bg-blue-50 blur-lg" />
              <TbCalendarTime className="relative text-4xl text-gray-300" />
            </div>
            <p className="text-xs font-black tracking-widest text-gray-400 uppercase">No Schedule</p>
            <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-tight">No upcoming appointments for today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

//  upcoming reservation component
export const UpcomingReservations = ({ reservations, branchId }) => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white border border-gray-300 rounded-2xl">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300">
        <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
          <FiShoppingCart className="text-lg text-purple-600" />
          Upcoming Reservations
        </h2>
        
        <button 
          onClick={() => navigate(`/clinic/${branchId}/portal/shop-management`)}
          className="text-xs font-bold text-gray-400 capitalize tracking-widest hover:text-(--clr-primary) cursor-pointer"
        >
          View all
        </button>
      </div>
      
      <div className="space-y-3">
        {reservations.length > 0 ? (
          reservations.map((res) => {
            const pickupDate = new Date(res.pickup_date);
            const today = new Date();
            const isOverdue = pickupDate.setHours(0,0,0,0) < today.setHours(0,0,0,0);

            return (
              <div 
                key={res.order_id}
                className={`group flex items-center justify-between p-3 transition-all border cursor-pointer rounded-xl ${
                  isOverdue 
                    ? 'border-red-200 bg-red-50/30 hover:border-red-400' 
                    : 'border-gray-300 bg-gray-50 hover:border-(--clr-primary)'
                }`}
                onClick={() => navigate(`/clinic/${branchId}/portal/shop-management?view=${res.order_id}`)}
              >
                <div className="flex items-center flex-1 min-w-0 gap-3">
                  {/* Product Picture */}
                  <div className="w-12 h-12 overflow-hidden bg-white border border-gray-200 rounded-lg shrink-0">
                    <img 
                      src={res.first_item_pic ? `${API_URL}/${res.first_item_pic}` : NoImage} 
                      alt="Product" 
                      className="object-cover w-full h-full transition-transform group-hover:scale-110"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-2 mb-0.5 pr-2">
                      
                      {/* CUSTOMER NAME */}
                      <p className={`text-xs font-black uppercase truncate ${
                        isOverdue ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {res.customer_name}
                      </p>

                      {/* check if overdue */}
                      {isOverdue ? (
                        <span className="flex items-center gap-0.5 text-[8px] font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 uppercase">
                          Overdue: {res.status}
                        </span>
                      ) : (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          res.status === 'pending' 
                            ? 'text-amber-600 bg-amber-50 border-amber-100' 
                            : 'text-(--clr-primary) bg-green-50 border-green-100'
                        }`}>
                          {res.status}
                        </span>
                      )}
                    </div>
                    {/* Product Names */}
                    <p className="text-[10px] font-bold text-gray-400 truncate pr-2">
                      {res.items_summary} 
                    </p>
                  </div>
                </div>

                {/* CHEVRON */}
                <div className={`flex items-center justify-center duration-300 ease-in-out rounded-lg w-7 h-7 shrink-0 ${
                  isOverdue 
                    ? 'bg-red-500 group-hover:bg-red-600' 
                    : 'bg-black group-hover:bg-(--clr-primary)'
                }`}>
                  <LuChevronRight size={16} className="text-white" />
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-gray-50/50">
            <div className="relative mb-3">
              <div className="absolute inset-0 scale-150 rounded-full bg-purple-50 blur-lg" />
              <TbShoppingCartOff className="relative text-4xl text-gray-300" />
            </div>
            <p className="text-xs font-black tracking-widest text-gray-400 uppercase">
              No reservations
            </p>
            <p className="mt-1 text-xs font-medium text-gray-400">
              No upcoming reservations for today.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


// branch top earners
export const BranchTopEarnersChart = ({ data = [], isLoading, timeFilter }) => {
  const chartData = [...data]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, 10)
    .map(branch => ({
      id: branch.branch_id, 
      name: branch.name,
      Revenue: Number(branch.revenue)
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; 
      return (
        <div className="px-3 py-2 text-[10px] font-black tracking-widest text-center text-white uppercase bg-gray-900 rounded-lg shadow-2xl border border-gray-700 pointer-events-none z-50">
          <p className="pb-1 mb-1 border-b border-gray-700">{data.name}</p>
          <p className="text-(--clr-primary)">
            ₱{Number(data.Revenue).toLocaleString(undefined, { 
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
    <div className="flex flex-col h-full min-h-[400px] p-6 bg-white border border-gray-300 rounded-2xl w-full duration-300 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-300 shrink-0">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
            <LuTrendingUp className="text-(--clr-primary) text-lg" />
            Top 10 Branch Earners
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Revenue Performance ({timeFilter})
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full mt-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-(--clr-primary) rounded-full animate-spin"></div>
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
                  <stop offset="0%" stopColor="var(--clr-primary)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--clr-primary)" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--clr-primary)" stopOpacity={0.08} /> {/* Lowered opacity */}
                  <stop offset="100%" stopColor="var(--clr-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* DARKER GRID STROKE */}
              <CartesianGrid 
                vertical={false} 
                stroke="#e2e8f0" 
                strokeDasharray="3 3" 
              />
              
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
              
              <Area 
                type="monotone" 
                dataKey="Revenue" 
                fill="url(#lineAreaGradient)" 
                stroke="none" 
              />

              <Line 
                type="monotone" 
                dataKey="Revenue" 
                stroke="var(--clr-primary)" 
                strokeWidth={2} 
                dot={false} 
                opacity={0.3}
              />

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
