import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, ComposedChart, Line, Bar,
} from 'recharts';
// image
import NoImage from '../../../../assets/images/no-image.jpg';
import { LuTrendingUp } from 'react-icons/lu';
const API_URL = import.meta.env.VITE_API_URL;

// branch top earners
export const PlatformRevenueChart = ({ data = [], isLoading, timeFilter }) => {
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
