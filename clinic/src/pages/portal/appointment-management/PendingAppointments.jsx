import { motion } from 'framer-motion';
// icons
import { HiInbox, HiOutlineUser, HiOutlineChevronRight } from 'react-icons/hi';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, 
    },
  },
};

const itemVariants = {
  hidden: { x: 10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { stiffness: 300, damping: 24 },
  },
};

export default function PendingAppointments({ pendingAppointment = [], loading, onSelect }) {
  return (
    <aside className="flex flex-col w-96 bg-[#F9FBFC] border border-gray-300 overflow-hidden h-full rounded-lg min-h-[500px]">
      {/* header */}
      <div className="p-6 bg-white border-b border-gray-300">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[11px] font-black tracking-[0.2em] uppercase">
            <HiInbox className="text-(--clr-primary) text-lg" /> Inbox
          </h2>
          <span className="bg-(--clr-primary) text-white text-[9px] font-black px-2 py-0.5 rounded-full">
            {pendingAppointment?.length || 0}
          </span>
        </div>
      </div>

      {/* cards container */}
      <motion.div 
        className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={pendingAppointment.length} 
      >
        {loading ? (
          <div className="py-10 text-center text-[10px] font-black text-gray-300 uppercase animate-pulse tracking-widest">
            Syncing...
          </div>
        ) : pendingAppointment?.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="py-20 text-center opacity-20 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
          >
            Inbox Clear
          </motion.div>
        ) : (
          pendingAppointment.map((app) => (
            <motion.div 
              key={app.id} 
              onClick={() => onSelect(app)}
              variants={itemVariants}
              whileHover={{ x: 5 }} 
              className="flex items-center bg-white rounded-2xl border p-2 transition-colors border-gray-300 group hover:border-(--clr-primary) cursor-pointer"
            >
              {/* card left section */}
              <div className="flex-1 p-2 truncate">
                <div className="flex items-center gap-1.5 mb-1">
                  <HiOutlineUser size={12} className="text-gray-400" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight truncate">
                    {app.owner_fname} {app.owner_lname}
                  </p>
                </div>
                
                <h3 className="text-sm font-black group-hover:text-(--clr-text-header)">
                  {app.pet_name}
                </h3>
                
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-80">
                  {app.service_name?.replace(/_/g, ' ')}
                </p>
              </div>

              {/* card right section */}
              <div className="pl-2">
                <button 
                  onClick={() => onSelect(app)}
                  className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 whitespace-nowrap bg-(--clr-black) text-white hover:bg-(--clr-primary) cursor-pointer transition-transform active:scale-95"
                >
                  View
                  <HiOutlineChevronRight size={10} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </aside>
  );
}