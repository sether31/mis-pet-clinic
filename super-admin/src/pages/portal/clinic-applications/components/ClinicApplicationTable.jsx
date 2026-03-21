import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom'; 
// components
import ClinicApplicationModal from './ClinicApplicationModal';
// icons
import { 
  HiSearch, HiChevronLeft, HiChevronRight, HiEye, HiChevronUp, HiChevronDown
} from 'react-icons/hi';
import { CiSearch } from 'react-icons/ci';


export default function ClinicApplicationTable({ data = [], onAccept, onReject }) {
  const location = useLocation();   
  const navigate = useNavigate();     

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState('asc');

  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- NEW: Auto-open modal if navigated from notification ---
  useEffect(() => {
    // Check if we have data AND an incoming branch ID in the navigation state
    if (data.length > 0 && location.state?.openBranchId) {
      const targetId = location.state.openBranchId;
      const targetBranch = data.find(b => b.branch_id === targetId);

      if (targetBranch) {
        // Open the modal
        setSelectedBranch(targetBranch);
        setAdminFeedback(targetBranch.feedback || "");

        // Clear the state from the URL so it doesn't re-open if the user refreshes the page
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [data, location.state, navigate, location.pathname]);
  // -----------------------------------------------------------

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

  const totalPages = Math.ceil(filtered.length / entriesPerPage);
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  
  useEffect(() => { setCurrentPage(1); }, [activeTab, search, entriesPerPage]);

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

  return (
    <div className="w-full bg-white rounded-xl border border-gray-300 overflow-hidden flex flex-col">
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
                activeTab === tab.id ? "bg-(--clr-primary) text-(--clr-text-secondary)" : "text-gray-500 hover:text-(--clr-text-primary)"
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
            <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:bg-white focus:ring-1 focus:ring-(--clr-primary) transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[460px]">
        <table className="w-full text-left table-fixed">
          {/* table head */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold text-(--clr-text-primary) uppercase tracking-widest">
              <th className="w-[35%] px-6 py-4 border-r border-gray-300">Branch Name</th>
              <th className="w-[25%] px-6 py-4 border-r border-gray-300">Owner</th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300">Municipality</th>
              <th 
                className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="text-gray-400 group-hover:text-(--clr-primary)">
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
            {paginated.length > 0 ? 
              paginated.map(branch => (
                <tr key={branch.branch_id} className="hover:bg-gray-200/50 even:bg-gray-200/50">
                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="text-sm font-bold text-(--clr-text-primary)">{branch.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">ID: {branch.branch_id}</div>
                  </td>
                  <td className="px-6 py-4 border-r border-gray-300 text-sm font-medium text-(--clr-text-primary)">
                    {branch.first_name} {branch.last_name}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-300 text-sm text-center font-medium text-(--clr-text-primary)">
                    {branch.municipality}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-300 text-sm font-medium text-(--clr-text-primary)">
                    {new Date(branch.created_at).toLocaleDateString('en-Us', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                    <span className={`px-2 py-1 rounded border 
                      ${branch.status === 'approved' 
                        ? 'bg-green-50 text-(--clr-primary) border-green-200' 
                        : branch.status === 'pending' 
                          ? 'bg-amber-50 text-amber-600 border-amber-200' 
                          : 'bg-red-50 text-red-600 border-red-200'}`}>
                            {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => { setSelectedBranch(branch); setAdminFeedback(branch.feedback || ""); }} 
                      className="p-2 transition-all border border-gray-300 rounded-lg cursor-pointer hover:text-(--clr-primary) hover:border-(--clr-primary)">
                      <HiEye size={16}/>
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="p-4 rounded-full bg-gray-50">
                        <CiSearch className="text-gray-300" size={40} />
                      </div>
                      <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab}  Clinic found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {search
                          ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                          : `There are currently no clinic request marked as ${activeTab}.`}
                      </p>
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="mt-4 text-sm font-bold text-(--clr-primary) hover:underline cursor-pointer"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            }
          </tbody>
        </table>
      </div>

      {/* footer pagination*/}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filtered.length}</span>

        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>

      {/* view details modal */}
      {selectedBranch && (
        <ClinicApplicationModal 
          selectedBranch={selectedBranch}
          adminFeedback={adminFeedback}
          setAdminFeedback={setAdminFeedback}
          isSubmitting={isSubmitting}
          onClose={() => setSelectedBranch(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}