// icons
import { HiInbox, HiOutlineUser, HiOutlineChevronRight, HiExclamation } from 'react-icons/hi';

export default function PendingAppointments({ pendingAppointment = [], loading, onSelect }) {
  const now = new Date();

  return (
    <aside className="flex flex-col w-full bg-[#F9FBFC] border border-gray-300 overflow-hidden h-full rounded-lg min-h-[550px] max-h-[650px]">
      {/* header */}
      <div className="p-6 bg-white border-b border-gray-300">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[11px] font-black uppercase">
            <HiInbox className="text-lg" /> Pending Appointments
          </h2>
          <span className="bg-(--clr-black) text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            {pendingAppointment?.length || 0}
          </span>
        </div>
      </div>

      {/* cards container */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-10 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse tracking-widest">
            Syncing...
          </div>
        ) : pendingAppointment?.length === 0 ? (
          <div className="py-20 text-center opacity-20 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Inbox Clear
          </div>
        ) : (
          pendingAppointment.map((app) => {
            const isPast = new Date(app.start) < now;
            
            // LOGIC: Prioritize Order Items for a complete list (Services + Products)
            // If order_items exists, join their names. Otherwise, fallback to service_names string.
            const displayList = app.order_items?.length > 0 
              ? app.order_items.map(item => item.item_name).join(', ')
              : (app.service_names || "General Service");

            return (
              <div 
                key={app.id} 
                onClick={() => onSelect(app)}
                className={`relative flex items-center bg-white rounded-2xl border p-2 transition-all duration-300 group cursor-pointer hover:translate-x-1
                  ${isPast 
                    ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400' 
                    : 'border-gray-300 hover:border-(--clr-primary)'
                  }`}
              >
                {/* show if expired */}
                {isPast && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 z-10">
                    <HiExclamation size={10} />
                    <span className="text-[7px] font-black uppercase tracking-tighter">Schedule Outdated</span>
                  </div>
                )}

                {/* card left section */}
                <div className="flex-1 p-2 truncate">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HiOutlineUser size={12} className={isPast ? "text-amber-400" : "text-gray-400"} />
                    <p className={`text-[10px] font-bold uppercase tracking-tight truncate ${isPast ? "text-amber-600/70" : "text-gray-400"}`}>
                      {app.owner_fname} {app.owner_lname}
                    </p>
                  </div>
                  
                  <h3 className={`text-sm font-black truncate ${isPast ? "text-amber-900" : "text-gray-700"}`}>
                    {app.pet_name}
                  </h3>
                  
                  {/* Shows the dynamic list of items (e.g. "Deworming, Vitamins") */}
                  <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80 truncate ${isPast ? "text-amber-700" : "text-gray-400"}`}>
                    {displayList.replace(/_/g, ' ')}
                  </p>

                  {isPast && (
                    <p className="text-[8px] font-black text-amber-600 uppercase mt-1">
                      The requested time has passed.
                    </p>
                  )}
                </div>

                {/* card right section */}
                <div className="pl-2">
                  <div className={`p-2 rounded-md transition-all active:scale-95
                      ${isPast 
                        ? 'bg-amber-600 text-white group-hover:bg-amber-700' 
                        : 'bg-black text-white group-hover:bg-(--clr-primary)'
                      }`}
                  >
                    <HiOutlineChevronRight size={12} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}