import { 
  HiXCircle, HiOutlineDocumentText, HiOutlineUser,
  HiOutlineLocationMarker, HiOutlineChatAlt, HiPlay, 
  HiPause, HiSave 
} from 'react-icons/hi';
import { LuBriefcaseBusiness, LuClock, LuPhone } from 'react-icons/lu';
import { RiInformation2Line } from "react-icons/ri";
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisteredClinicModal({ 
  selectedBranch, 
  onClose, 
  adminFeedback, 
  setAdminFeedback, 
  isSubmitting, 
  onAction 
}) {
  if (!selectedBranch) return null;

  // Logic to handle status changes with validation
  const handleToggleStatus = (newStatus) => {
    if (newStatus === 'suspended' && !adminFeedback?.trim()) {
      toast.error("Please provide a reason in the feedback area before suspending.");
      return;
    }
    onAction(selectedBranch.branch_id, newStatus, adminFeedback);
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-(--clr-text-primary)/80 backdrop-blur-sm p-4 text-left">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header - Same as before */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
                {selectedBranch.name}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                View clinic details
              </p>
            </div>
            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${
              selectedBranch.status === 'approved' ? 'border-green-200 text-(--clr-primary) bg-green-50' : 
              'border-red-200 text-red-600 bg-red-50'
            }`}>
              {selectedBranch.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors cursor-pointer hover:text-red-500" disabled={isSubmitting}>
            <HiXCircle size={32}/>
          </button>
        </div>

        <div className="p-8 space-y-12 overflow-y-auto">
          {/* Documents Section */}
          <section>
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-wider mb-6 flex items-center gap-1">
              <HiOutlineDocumentText size={20}/> Verification Documents
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <DocCard label="Business Permit" img={`${API_URL}/${selectedBranch.business_permit_picture}`} id={selectedBranch.business_permit_number} />
              <DocCard label="TIN ID" img={`${API_URL}/${selectedBranch.tin_id_picture}`} id={selectedBranch.tin_id_number} />
            </div>
          </section>

          {/* Contact & Location Info */}
          <section className="pt-10 space-y-8 border-t border-gray-100">
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-wider flex items-center gap-1">
              <RiInformation2Line size={20} /> Contact Information
            </h3>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Clinic Owner" icon={<HiOutlineUser />} value={`${selectedBranch.first_name} ${selectedBranch.last_name}`} />
              <Detail label="Email" icon={<HiOutlineUser />} value={`${selectedBranch.owner_email}`} />
              <Detail label="Contact Number" icon={<LuPhone />} value={selectedBranch.contact_number} />
              <Detail label="Municipality" icon={<HiOutlineLocationMarker />} value={selectedBranch.municipality} />
              <Detail label="Full Address" icon={<HiOutlineLocationMarker />} value={selectedBranch.address} />
            </div>
          </section>

          {/* SERVICES OFFERED SECTION */}
          <section className="pt-10 space-y-4 border-t border-gray-100">
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-wider flex items-center gap-1">
              <LuBriefcaseBusiness size={18} /> Services Offered
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedBranch.services_list ? (
                selectedBranch.services_list.split(', ').map((service, index) => (
                  <div key={index} className="px-4 py-2 bg-(--clr-primary)/10 border border-(--clr-primary)/20 text-(--clr-primary) text-[10px] font-black rounded-lg uppercase">
                    {service.replace(/_/g, ' ')}
                  </div>
                ))
              ) : <span className="text-sm italic text-gray-400">No services selected</span>}
            </div>
          </section>

          {/* Feedback Section */}
          <section className="pt-10 pb-6 space-y-6 border-t border-gray-100">
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-wider flex items-center gap-1">
              <HiOutlineChatAlt size={20}/> Evaluation Feedback
            </h3>
            <div className="p-6 border border-gray-200 bg-gray-50 rounded-2xl">
              <textarea 
                className="w-full h-32 p-4 text-sm transition-all bg-white border border-gray-300 outline-none rounded-xl focus:ring focus:ring-gray-700"
                placeholder="Enter feedback or reason for status change..." 
                value={adminFeedback} 
                onChange={(e) => setAdminFeedback(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
          {/* JUST SAVE FEEDBACK */}
          <button 
            disabled={isSubmitting} 
            onClick={() => onAction(selectedBranch.branch_id, selectedBranch.status, adminFeedback)} 
            className="flex items-center gap-2 px-6 py-3 bg-(--clr-text-primary) text-(--clr-text-secondary) text-[11px] font-black rounded-xl uppercase tracking-wider hover:opacity-90 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
          >
            <HiSave size={16} /> {isSubmitting ? "Saving..." : "Save Notes"}
          </button>

          {/* TOGGLE STATUS */}
          {selectedBranch.status === 'approved' ? (
            <button 
              disabled={isSubmitting} 
              onClick={() => handleToggleStatus('suspended')} 
              className="flex items-center gap-2 px-8 py-3 bg-red-600 text-white text-[11px] font-black rounded-xl uppercase hover:bg-red-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <HiPause size={16} /> Suspend Clinic
            </button>
          ) : (
            <button 
              disabled={isSubmitting} 
              onClick={() => handleToggleStatus('approved')} 
              className="flex items-center gap-2 px-8 py-3 bg-(--clr-primary)/95 text-white text-[11px] font-black rounded-xl uppercase hover:bg-(--clr-primary) transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              Activate Clinic
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Internal Helper Components (DocCard and Detail remain the same as your code)
function DocCard({ label, img, id }) {
  const fullImgUrl = img.replace(/([^:])\/\//g, '$1/');
  return (
    <div className="flex flex-col overflow-hidden bg-white border rounded-2xl group">
      <div className="px-4 py-2 bg-gray-50 border-b text-[9px] font-black text-gray-500 uppercase tracking-wider flex justify-between items-center">
        {label} <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">Click to view</span>
      </div>
      <a href={fullImgUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-48 overflow-hidden bg-gray-100 cursor-zoom-in">
        <img src={fullImgUrl} className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" alt={label} />
      </a>
      <div className="p-3 text-[10px] font-bold text-gray-400 uppercase">ID: {id}</div>
    </div>
  );
}

function Detail({ label, value, icon }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black uppercase text-(--clr-text-primary) block tracking-wider">{label}</span>
      <span className="flex items-center gap-1 text-sm font-bold text-gray-800">
        <span className="text-gray-400">{icon}</span> {value || "---"}
      </span>
    </div>
  );
}