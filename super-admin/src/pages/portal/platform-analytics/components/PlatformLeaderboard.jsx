import { FiCheckCircle, FiMapPin } from 'react-icons/fi';
import { MdOutlineSubscriptions } from 'react-icons/md';

const LeaderList = ({ title, items, icon: Icon, type, timeFilter }) => (
  <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm">
    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="text-(--clr-primary) rounded-lg">
          <Icon size={18} />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">{title}</h3>
      </div>
      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md uppercase">
        {timeFilter}
      </span>
    </div>
    
    <div className="space-y-4">
      {items && items.length > 0 ? items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between group">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-gray-700">
                {item.name}
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase">
                {/* Dynamic label based on the list type */}
                {type === 'subscription' 
                  ? `${item.total_sold} Active Subs` 
                  : `${item.branch_count} Clinics`}
            </span>
          </div>
          <span className="text-xs font-black text-(--clr-primary)">
            ₱{Number(item.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )) : (
        <div className="flex flex-col items-center py-6">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-center">
            No {type} data recorded <br/> for this period
          </p>
        </div>
      )}
    </div>
  </div>
);

export default function PlatformLeaderboard({ topSubscriptions = [], topRegions = [], timeFilter }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Top Subscription Plans */}
      <LeaderList 
        title="Top Subscription Plans" 
        items={topSubscriptions} 
        icon={MdOutlineSubscriptions} 
        type="subscription" 
        timeFilter={timeFilter} 
      />

      {/* 2. Top Performing Regions */}
      <LeaderList 
        title="Growth Regions" 
        items={topRegions} 
        icon={FiMapPin} 
        type="region" 
        timeFilter={timeFilter} 
      />
    </div>
  );
}