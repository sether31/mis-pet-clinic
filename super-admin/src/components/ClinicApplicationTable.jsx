import{ useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
// icons
import { 
  HiSearch, HiChevronLeft, HiChevronRight,  
  HiXCircle, HiOutlineDocumentText, HiOutlineUser,
  HiOutlineLocationMarker, HiOutlineChatAlt, HiEye, 
  HiSave, HiLockClosed, HiChevronUp, HiChevronDown
} from 'react-icons/hi';
import { LuBriefcaseBusiness } from 'react-icons/lu';
import { RiInformation2Line } from "react-icons/ri";
import { LuClock } from "react-icons/lu";

const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicApplicationTable({ data = [], onAccept, onReject }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState('asc');

  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  

  // filtering with memo 
  const filtered = useMemo(() => {
    let result = data
      .filter(c => activeTab === "all" ? true : c.status === activeTab)
      .filter(c => {
        const q = search.toLowerCase();
        return !q || 
          c.name?.toLowerCase().includes(q) || 
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
          c.municipality?.toLowerCase().includes(q);
      });

    // sort by date
    return result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [data, activeTab, search, sortOrder]); 

  // like if pending is 6 then divide by entries page
  const totalPages = Math.ceil(filtered.length / entriesPerPage);
  // take a copy of filtered then compute it giving it a start and end cutting the filtered array
  // if current page is 1 then start will return 0 while end will return the max of entries successfully giving the entry page cut
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  // so at every mount it will be set to current page one
  useEffect(() => { setCurrentPage(1); }, [activeTab, search, entriesPerPage]);

  // handle the action props
  const handleAction = async (id, newStatus, feedback) => {
    setIsSubmitting(true);
    try {
      if(newStatus === 'approved') {
        await onAccept(id, feedback);
        toast.success(`${selectedBranch.name} is now Approved`);
      } 
      else if(newStatus === 'rejected') {
        await onReject(id, feedback);

        if(selectedBranch.status === 'rejected') {
          toast.success("Feedback updated successfully");
        } else {
          toast.success(`${selectedBranch.name} has been Rejected`);
        }
      }
      
      setSelectedBranch(null); 
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // format time
  const formatTime = (timeString) => {
    if(!timeString) return "---";
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch(e) {
      return timeString;
    }
  };

  return (
    <div className="w-full bg-[var(--clr-bg-card)] rounded-xl border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      {/* tabs and filter */}
      <div className="flex flex-col justify-between gap-4 p-4 border-b border-gray-300 lg:flex-row">
        {/* tab */}
        <div className="flex w-full p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[
            {id:"all", label:"All" },
            {id:"pending", label:"Pending" }, 
            {id:"approved", label:"Approved" }, 
            {id:"rejected", label:"Rejected" }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-6 py-2 text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${
                activeTab === tab.id ? "bg-[var(--clr-primary)] text-[var(--clr-text-secondary)]" : "text-gray-500 hover:text-[var(--clr-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* search */}
        <div className="flex items-center gap-3">
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer">
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:bg-white focus:border-[var(--clr-primary)] transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[460px]">
        <table className="w-full text-left table-fixed">
          {/* table head */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold text-[var(--clr-text-primary)] uppercase tracking-widest">
              <th className="w-[35%] px-6 py-4 border-r border-gray-300">Branch Name</th>
              <th className="w-[25%] px-6 py-4 border-r border-gray-300">Owner</th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300">Municipality</th>
              <th 
                className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="text-gray-400 group-hover:text-[var(--clr-primary)]">
                    {sortOrder === 'asc' ? <HiChevronUp size={16}/> : <HiChevronDown size={16}/>}
                  </span>
                </div>
              </th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300">Status</th>
              <th className="w-[10%] px-6 py-4">Action</th>
            </tr>
          </thead>

          {/* table body */}
          <tbody className="divide-y divide-gray-200">
            {/* check if theres a data exist smth */}
            {paginated.length > 0 ? 
              // table row with map data
              paginated.map(branch => (
                <tr key={branch.branch_id} className="hover:bg-gray-200/50 even:bg-gray-200/50">
                  {/* Changed border color to gray-300 and text to your variable */}
                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="text-sm font-bold text-[var(--clr-text-primary)]">{branch.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">ID: {branch.branch_id}</div>
                  </td>
                  {/* branch name */}
                  <td className="px-6 py-4 border-r border-gray-300 text-sm font-medium text-[var(--clr-text-primary)]">
                    {branch.first_name} {branch.last_name}
                  </td>
                  {/* municipality */}
                  <td className="px-6 py-4 border-r border-gray-300 text-sm text-center font-medium text-[var(--clr-text-primary)]">
                    {branch.municipality}
                  </td>
                  {/* branch date */}
                  <td className="px-6 py-4 border-r border-gray-300 text-sm font-medium text-[var(--clr-text-primary)]">
                    {new Date(branch.created_at).toLocaleDateString('en-Us', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  {/* branch status  */}
                  <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                    <span className={`px-2 py-1 rounded border 
                      ${branch.status === 'approved' 
                        ? 'bg-green-50 text-green-600 border-green-200' 
                        : branch.status === 'pending' 
                          ? 'bg-amber-50 text-amber-600 border-amber-200' 
                          : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {branch.status}
                    </span>
                  </td>
                  {/* branch action */}
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => { setSelectedBranch(branch); setAdminFeedback(branch.feedback || ""); }} 
                      className="p-2 transition-all border border-gray-300 rounded-lg cursor-pointer hover:text-green-600 hover:border-green-600">
                      <HiEye size={16}/>
                    </button>
                  </td>
                </tr>
              )) : (
                // without data
                <tr><td colSpan="6" className="py-20 text-xs font-bold tracking-widest text-center text-gray-400 uppercase">No Applications Found</td></tr>
              )
            }
          </tbody>
        </table>
      </div>

      {/* footer pagination*/}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total Found: {filtered.length}</span>

        <div className="flex items-center gap-2">
          {/* prev page */}
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          {/* show total and current page */}
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          {/* next page */}
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>




      {/* view details modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-var[(--clr-text-primary)]/80 backdrop-blur-sm p-4 text-left">
          <div className="bg-[var(--clr-bg-page)] w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-[var(--clr-bg-page)]">
              <div className="flex items-center gap-4">
                {/* modal header */}
                <h2 className="text-xl font-black text-var[(--clr-text-primary)] uppercase tracking-tight">{selectedBranch.name}</h2>
                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase border ${selectedBranch.status === 'approved' ? 'border-green-200 text-green-600 bg-green-50' : selectedBranch.status === 'pending' ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-red-200 text-red-600 bg-red-50'}`}>
                    {selectedBranch.status}
                </span>
              </div>
              {/* close modal */}
              <button onClick={() => setSelectedBranch(null)} className="text-gray-400 cursor-pointer hover:text-red-500" disabled={isSubmitting}><HiXCircle size={32}/></button>
            </div>

            {/* document data */}
            <div className="p-8 space-y-12 overflow-y-auto">
              <section>
                <h3 className="text-[11px] font-black text-[var(--clr-text-primary)] uppercase tracking-widest mb-6 flex items-center gap-2"><HiOutlineDocumentText size={18}/> Verification Documents</h3>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  <DocCard label="Vet License" img={`${API_URL}/${selectedBranch.vet_license_picture}`} id={selectedBranch.vet_license_number} />
                  <DocCard label="Business Permit" img={`${API_URL}/${selectedBranch.business_permit_picture}`} id={selectedBranch.business_permit_number} />
                  <DocCard label="TIN ID" img={`${API_URL}/${selectedBranch.tin_id_picture}`} id={selectedBranch.tin_id_number} />
                </div>
              </section>

              {/* contact info */}
              <section className="pt-10 space-y-8 border-t border-gray-100">
                <h3 className="text-[11px] font-black text-[var(--clr-text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <RiInformation2Line size={18} /> 
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Clinic Owner" icon={<HiOutlineUser />} value={`${selectedBranch.first_name} ${selectedBranch.last_name}`} />
                  <Detail label="Municipality" icon={<HiOutlineLocationMarker />} value={selectedBranch.municipality} />
                  <Detail label="Operating Start" icon={<LuClock />} value={formatTime(selectedBranch.operating_hours_start_time)} />
                  <Detail label="Operating End" icon={<LuClock />} value={formatTime(selectedBranch.operating_hours_end_time)} />
                  <Detail label="Full Street Address" icon={<HiOutlineLocationMarker />} value={selectedBranch.address} />
                </div>
              </section>

              {/* services */}
              <section className="pt-10 space-y-4 border-t border-gray-100">
                <h3 className="text-[11px] font-black text-[var(--clr-text-primary)] uppercase tracking-widest flex items-center gap-2">
                  <LuBriefcaseBusiness size={18} /> 
                  Services Offered
                </h3>
                              
                <div className="flex flex-wrap gap-2">
                  {selectedBranch.services_list ? (
                    selectedBranch.services_list.split(', ').map((service, index) => (
                      <div 
                        key={index}
                        className="px-4 py-2 bg-[var(--clr-primary)]/10 border border-[var(--clr-primary)]/20 text-[var(--clr-primary)] text-[10px] font-black rounded-lg uppercase"
                      >
                        {/* This removes the _ and makes it look like 'GENERAL CHECKUP' */}
                        {service.replace(/_/g, ' ')}
                      </div>
                    ))
                  ) : (
                    <span className="text-sm italic text-gray-400">No services selected</span>
                  )}
                </div>
              </section>


              {/* evaluation */}
              <section className="pt-10 pb-6 space-y-6 border-t border-gray-100">
                <div className="flex items-center justify-between">
                   <h3 className="text-[11px] font-black text-[var(--clr-text-primary)] uppercase tracking-widest flex items-center gap-2">
                     <HiOutlineChatAlt size={18}/> Evaluation Feedback
                   </h3>
                   {/* lock icon */}
                   {selectedBranch.status === 'approved' && (
                     <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                       <HiLockClosed/> Locked
                     </span>
                   )}
                </div>
                
                {/* eval textarea */}
                <div className={`rounded-2xl p-6 border ${
                  selectedBranch.status === 'pending' ? "bg-[var(--clr-bg-page)] border-gray-300" : "bg-gray-50 border-gray-200"
                }`}>
                  <textarea 
                    className={`w-full p-4 rounded-xl text-sm h-32 outline-none transition-all border 
                      ${selectedBranch.status === 'approved' 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" 
                        : "bg-white focus:ring-2 focus:ring-green-500/20 border-gray-300"
                      }`
                    }
                    placeholder={selectedBranch.status === 'approved' ? "Feedback locked for approved records." : "State the reason for approval or rejection..."} 
                    value={adminFeedback} 
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    disabled={selectedBranch.status === 'approved' || isSubmitting}
                  />
                </div>
              </section>
            </div>

            {/* ACTION FOOTER */}
            <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
              {selectedBranch.status === 'rejected' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => handleAction(selectedBranch.branch_id, 'rejected', adminFeedback)} 
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--clr-text-primary)] text-[var(--clr-text-secondary)] text-[11px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 cursor-pointer transition-all disabled:opacity-50"
                >
                  <HiSave size={16}/> {isSubmitting ? "Updating..." : "Update Feedback"}
                </button>
              )}

              {/* reject action btn */}
              {selectedBranch.status !== 'approved' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => handleAction(selectedBranch.branch_id, 'approved', adminFeedback)} 
                  className="px-10 py-3 bg-[var(--clr-primary)] text-[var(--clr-text-secondary)] text-[11px] font-black rounded-xl uppercase tracking-widest hover:opacity-90 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Processing..." : "Approve Branch"}
                </button>
              )}

              {/* approve action btn */}
              {selectedBranch.status !== 'rejected' && (
                <button 
                  disabled={isSubmitting}
                  onClick={() => handleAction(selectedBranch.branch_id, 'rejected', adminFeedback)} 
                  className="px-10 py-3 border-2 border-red-500 text-red-600 text-[11px] font-black rounded-xl uppercase tracking-widest hover:bg-red-50 transition-all  cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Wait..." : "Reject Application"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// document card
function DocCard({ label, img, id }) {
  // cleaning the ur; in case there are double slashes smth
  const fullImgUrl = img.replace(/([^:])\/\//g, '$1/');

  return (
    <div className="bg-[var(--clr-text-secondary)] border rounded-2xl overflow-hidden group flex flex-col">
      <div className="px-4 py-2 bg-gray-50 border-b text-[9px] font-black text-[var(--clr-text-header)] uppercase tracking-widest flex justify-between items-center">
        {label}
        {/* Adds a little indicator that it's clickable */}
        <span className="text-[8px] text-[var(--clr-text-header)]">Click to expand</span>
      </div>
      
      <a 
        href={fullImgUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center h-48 overflow-hidden bg-gray-100 cursor-zoom-in"
      >
        <img 
          src={fullImgUrl} 
          className="object-cover w-full h-full transition-transform duration-500 bg-black/5 group-hover:scale-105" 
          alt={label} 
        />
      </a>

      <div className="p-3 text-[10px] font-bold text-gray-400 uppercase">
        NO: <span className="font-black text-gray-400">{id}</span>
      </div>
    </div>
  );
}
// clinic information
function Detail({ label, value, icon }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-black uppercase text-[var(--clr-text-primary)] block tracking-widest">{label}</span>
      <span className="text-sm font-bold text-[var(--clr-text-primary)] flex items-center gap-2">{icon}{value || "---"}</span>
    </div>
  );
}