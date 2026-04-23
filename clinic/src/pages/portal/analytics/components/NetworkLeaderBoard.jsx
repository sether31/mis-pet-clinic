import { FiPackage, FiActivity } from 'react-icons/fi';

const LeaderList = ({ title, items, icon: Icon, type, timeFilter }) => (
  <div className="bg-white border border-gray-300 rounded-2xl p-5">
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
      {items.length > 0 ? items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between group">
          <div className="flex flex-col gap-0.5">
            {/* Main Name */}
            <span className="text-xs font-bold text-gray-700">
                {item.name}
            </span>

            {/* PRODUCT DETAILS (Brand, Type, Dosage) */}
            {/* PRODUCT DETAILS (Brand, Type, Dosage) */}
            {type === 'product' && (
              <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold uppercase">
                <span>{item.brand_name || 'Generic'}</span>
                
                {/* Show brand_type ONLY if medication and not N/A */}
                {item.category?.toLowerCase() === 'medication' && 
                item.brand_type && item.brand_type.toLowerCase() !== 'n/a' && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{item.brand_type}</span>
                  </>
                )}

                {/* Show dosage ONLY if medication and not N/A */}
                {item.category?.toLowerCase() === 'medication' && 
                item.dosage && item.dosage.toLowerCase() !== 'n/a' && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-(--clr-primary)">{item.dosage}</span>
                  </>
                )}
              </div>
            )}

            {/* Units/Bookings Sold */}
            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-tighter">
                {type === 'service' ? `${item.total_sold} Bookings` : `${item.total_qty} Units Sold`}
            </span>
          </div>

          <span className="text-xs font-black text-(--clr-primary)">
            ₱{Number(item.total_revenue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )) : (
        <div className="flex flex-col items-center py-6">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest text-center">
            No {type} sales recorded <br/> for this period
          </p>
        </div>
      )}
    </div>
  </div>
);

export default function NetworkLeaderboard({ services = [], products = [], timeFilter }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <LeaderList 
        title="Top Services" 
        items={services} 
        icon={FiActivity} 
        type="service" 
        timeFilter={timeFilter} 
      />
      <LeaderList 
        title="Top Products" 
        items={products} 
        icon={FiPackage} 
        type="product" 
        timeFilter={timeFilter} 
      />
    </div>
  );
}