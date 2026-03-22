import { 
  HiXCircle, HiOutlineDocumentText, HiOutlineUser,
  HiOutlineLocationMarker, HiOutlineChatAlt, HiLockClosed, 
  HiSave 
} from 'react-icons/hi';
import { LuBriefcaseBusiness, LuClock, LuPhone } from 'react-icons/lu';
import { RiInformation2Line } from "react-icons/ri";

const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicApplicationModal({ 
  selectedBranch, 
  onClose, 
  adminFeedback, 
  setAdminFeedback, 
  isSubmitting, 
  onAction 
}) {
  if (!selectedBranch) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-(--clr-text-primary)/80 backdrop-blur-sm p-4 text-left">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-(--clr-bg-page)">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
                {selectedBranch.name}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                View clinic details
              </p>
            </div>
            <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${
              selectedBranch.status === 'approved' ? 'border-green-200 text-(--clr-primary) bg-green-50' : 
              selectedBranch.status === 'pending' ? 'border-amber-200 text-amber-600 bg-amber-50' : 
              'border-red-200 text-red-600 bg-red-50'
            }`}>
              {selectedBranch.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors cursor-pointer hover:text-red-500" disabled={isSubmitting}>
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-12 overflow-y-auto">
          {/* Documents */}
          <section>
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-widest mb-6 flex items-center gap-1">
              <HiOutlineDocumentText size={20}/> Verification Documents
            </h3>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <DocCard label="Business Permit" img={`${API_URL}/${selectedBranch.business_permit_picture}`} id={selectedBranch.business_permit_number} />
              <DocCard label="TIN ID" img={`${API_URL}/${selectedBranch.tin_id_picture}`} id={selectedBranch.tin_id_number} />
            </div>
          </section>

          {/* Contact Info */}
          <section className="pt-10 space-y-8 border-t border-gray-100">
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-widest flex items-center gap-1">
              <RiInformation2Line size={20} /> Contact Information
            </h3>
            <div className="flex flex-wrap gap-x-15 gap-y-6">
              <Detail label="Clinic Owner" icon={<HiOutlineUser />} value={`${selectedBranch.first_name} ${selectedBranch.last_name}`} />
              <Detail label="Email" icon={<HiOutlineUser />} value={`${selectedBranch.owner_email}`} />
              <Detail label="Contact Number" icon={<LuPhone />} value={selectedBranch.contact_number} />

              <Detail label="Municipality" icon={<HiOutlineLocationMarker />} value={selectedBranch.municipality} />
              <Detail label="Province/City" icon={<HiOutlineLocationMarker />} value={selectedBranch.province} />
              <Detail label="Full Street Address" icon={<HiOutlineLocationMarker />} value={selectedBranch.address} />
            </div>
          </section>

          {/* Services */}
          <section className="pt-10 space-y-4 border-t border-gray-100">
            <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-widest flex items-center gap-1">
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

          {/* Feedback */}
          <section className="pt-10 pb-6 space-y-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-(--clr-text-primary) uppercase tracking-widest flex items-center gap-1">
                <HiOutlineChatAlt size={18}/> Evaluation Feedback
              </h3>
              {selectedBranch.status === 'approved' && (
                <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <HiLockClosed/> Locked
                </span>
              )}
            </div>
            <div className={`rounded-2xl p-6 border ${selectedBranch.status === 'pending' ? "bg-(--clr-bg-page) border-gray-300" : "bg-gray-50 border-gray-200"}`}>
              <textarea 
                className={`w-full p-4 rounded-xl text-sm h-32 outline-none transition-all border ${
                  selectedBranch.status === 'approved' ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white focus:ring border-gray-300 focus:ring-gray-700"
                }`}
                placeholder={selectedBranch.status === 'approved' ? "Feedback locked for approved records." : "State the reason for approval or rejection..."} 
                value={adminFeedback} 
                onChange={(e) => setAdminFeedback(e.target.value)}
                disabled={selectedBranch.status === 'approved' || isSubmitting}
              />
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        {selectedBranch.status !== 'approved' && (
          <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
            {selectedBranch.status === 'rejected' && (
              <button disabled={isSubmitting} onClick={() => onAction(selectedBranch.branch_id, 'rejected', adminFeedback)} className="flex items-center gap-2 px-6 py-3 bg-(--clr-text-primary) text-(--clr-text-secondary) text-[11px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 cursor-pointer transition-all disabled:opacity-50 active:scale-95">
                <HiSave size={16}/> {isSubmitting ? "Updating..." : "Update Feedback"}
              </button>
            )}
            <button disabled={isSubmitting} onClick={() => onAction(selectedBranch.branch_id, 'approved', adminFeedback)} className="px-10 py-3 bg-(--clr-primary) text-(--clr-text-secondary) text-[11px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 cursor-pointer transition-all disabled:opacity-50 active:scale-95">
              {isSubmitting ? "Processing..." : "Approve Branch"}
            </button>
            {selectedBranch.status === 'pending' && (
              <button disabled={isSubmitting} onClick={() => onAction(selectedBranch.branch_id, 'rejected', adminFeedback)} className="px-10 py-3 border-2 border-red-500 text-red-600 text-[11px] font-black rounded-xl uppercase tracking-widest hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50 active:scale-95">
                {isSubmitting ? "Wait..." : "Reject Application"}
              </button>
            )}
          </div> 
        )}
      </div>
    </div>
  );
}

// Internal Helper Components
function DocCard({ label, img, id }) {
  const fullImgUrl = img.replace(/([^:])\/\//g, '$1/');
  return (
    <div className="bg-(--clr-text-secondary) border rounded-2xl overflow-hidden group flex flex-col">
      <div className="px-4 py-2 bg-gray-50 border-b text-[9px] font-black text-(--clr-text-header) uppercase tracking-widest flex justify-between items-center">
        {label} <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">Click to expand</span>
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
      <span className="text-sm font-bold text-(--clr-text-primary) flex items-center gap-1">
        {icon} {value || "---"}
      </span>
    </div>
  );
}