import { IoClose } from 'react-icons/io5';

export default function NotificationModal({ isOpen, onClose, notification, getCategoryBadge }) {
  if (!isOpen || !notification) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 duration-200 bg-black/50 backdrop-blur-sm">
      <div className="bg-white max-w-lg w-md rounded-xl p-6 flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h3 className="text-[20px] font-black text-gray-900 leading-tight">
                {notification.title}
              </h3>
              {/* Category Badge moved directly beside the title */}
              <div className="shrink-0 mt-0.5">
                {getCategoryBadge(notification.type)}
              </div>
            </div>
            <p className="text-[11px] font-bold text-blue-600 mt-1 uppercase tracking-wider">
              {notification.date}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="pr-2 mb-8 overflow-y-auto custom-scrollbar">
          <p className="text-[15px] font-medium leading-relaxed text-gray-700 whitespace-pre-wrap">
            {notification.message}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 mt-auto">
          {/* Changed to a neutral Close button */}
          <button 
            onClick={onClose}
            className="w-full py-3.5 bg-(--clr-primary)/95 hover:bg-(--clr-primary) text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}