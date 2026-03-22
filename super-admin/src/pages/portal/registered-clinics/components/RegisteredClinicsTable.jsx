import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useLocation, useNavigate } from 'react-router-dom'; 
// components
import RegisteredClinicModal from './RegisteredClinicModal';
// icons
import { 
  HiSearch, HiChevronLeft, HiChevronRight, HiEye, HiChevronUp, HiChevronDown
} from 'react-icons/hi';
import { CiSearch } from 'react-icons/ci';

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisteredClinicsTable({ data = [], onAction }) {
  const location = useLocation();   
  const navigate = useNavigate();     

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState('desc');

  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-open modal from notifications
  useEffect(() => {
    if (data.length > 0 && location.state?.openBranchId) {
      const targetId = location.state.openBranchId;
      const targetBranch = data.find(b => b.branch_id === targetId);
      if (targetBranch) {
        setSelectedBranch(targetBranch);
        setAdminFeedback(targetBranch.feedback || "");
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [data, location.state, navigate, location.pathname]);

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
    if (newStatus === 'suspended' && !feedback?.trim()) {
      toast.error("Feedback is required to suspend a clinic.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAction(id, newStatus, feedback);
      if (newStatus !== selectedBranch.status) {
        toast.success(`${selectedBranch.name} is now ${newStatus === 'approved' ? 'Active' : 'Suspended'}`);
        setSelectedBranch(null);
      } else {
        toast.success("Internal notes updated");
        setSelectedBranch(prev => ({...prev, feedback}));
      }
    } catch(error) {
      toast.error(error.message || "Failed to update clinic record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white border border-gray-300 rounded-xl">
      {/* Tabs and Filters */}
      <div className="flex flex-col justify-between gap-4 p-4 border-b border-gray-300 lg:flex-row">
        <div className="flex w-full p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[
            {id:"all", label:"All" },
            {id:"approved", label:"Active" }, 
            {id:"suspended", label:"Suspended" }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-6 py-2 text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${
                activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer">
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search Clinics..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:bg-white focus:ring-1 focus:ring-(--clr-primary) transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto min-h-[460px]">
        <table className="w-full text-left table-fixed">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              <th className="w-[35%] px-6 py-4 border-r border-gray-300">Clinic Details</th>
              <th className="w-[25%] px-6 py-4 border-r border-gray-300">Owner</th>
              <th className="w-[15%] px-6 py-4 border-r border-gray-300 text-center">Municipality</th>
              <th 
                className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center justify-between">
                  <span>Joined Date</span>
                  <span className="text-gray-400 group-hover:text-(--clr-primary)">
                    {sortOrder === 'asc' ? <HiChevronUp size={16}/> : <HiChevronDown size={16}/>}
                  </span>
                </div>
              </th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[10%] px-6 py-4 text-center">View</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? 
              paginated.map(branch => {
                const isSuspended = branch.status === 'suspended';
                return (
                  <tr key={branch.branch_id} className="hover:bg-gray-50 even:bg-gray-50/50">
                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex items-center gap-3">
                        {/* Branch Logo with fallback */}
                        <div className="flex-shrink-0 w-10 h-10 overflow-hidden bg-gray-100 border border-gray-200 rounded-lg">
                          <img 
                            src={branch.logo_picture ? `${API_URL}/${branch.logo_picture}` : `https://ui-avatars.com/api/?name=${branch.name}&background=d1fae5&color=42756C&bold=true`} 
                            alt="" 
                            className={`object-cover w-full h-full transition-all ${isSuspended ? 'grayscale opacity-50' : ''}`}
                            onError={(e) => e.target.src = 'https://ui-avatars.com/api/?name=' + branch.name}
                          />
                        </div>
                        <div>
                          <div className={`text-sm font-bold ${isSuspended ? 'text-gray-400' : 'text-gray-800'}`}>{branch.name}</div>
                          <div className="text-[10px] text-gray-400 font-medium uppercase">ID: {branch.branch_id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 border-r border-gray-300">
                      <div className="flex items-center gap-3">
                        {/* Owner Avatar with fallback */}
                        <div className="flex-shrink-0 w-8 h-8 overflow-hidden border rounded-full bg-emerald-50 border-emerald-100">
                          <img 
                            src={branch.owner_photo ? `${API_URL}/${branch.owner_photo}` : `https://ui-avatars.com/api/?name=${branch.first_name}+${branch.last_name}&background=d1fae5&color=42756C&bold=true`} 
                            alt="" 
                            className={`object-cover w-full h-full ${isSuspended ? 'grayscale opacity-50' : ''}`}
                          />
                        </div>
                        <div>
                          <div className={`text-sm font-medium ${isSuspended ? 'text-gray-400' : 'text-gray-800'}`}>{branch.first_name} {branch.last_name}</div>
                          <div className="text-[10px] text-gray-400">{branch.owner_email}</div>
                        </div>
                      </div>
                    </td>

                    <td className={`px-6 py-4 text-sm font-medium text-center border-r border-gray-300 ${isSuspended ? 'text-gray-400' : 'text-gray-600'}`}>
                      {branch.municipality}
                    </td>

                    <td className={`px-6 py-4 text-sm font-medium border-r border-gray-300 ${isSuspended ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(branch.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </td>

                    <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                      <span className={`px-2 py-1 rounded border 
                        ${branch.status === 'approved' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {branch.status === 'approved' ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <button onClick={() => { setSelectedBranch(branch); setAdminFeedback(branch.feedback || ""); }} 
                        className="p-2 transition-all border border-gray-300 rounded-lg cursor-pointer hover:text-(--clr-primary) hover:border-(--clr-primary)">
                        <HiEye size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="p-4 rounded-full bg-gray-50">
                        <CiSearch className="text-gray-300" size={40} />
                      </div>
                      <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab} Clinic found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {search
                          ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                          : `There are currently no clinics marked as ${activeTab}.`}
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

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-300 bg-gray-50">
        <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Total: {filtered.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>

      {selectedBranch && (
        <RegisteredClinicModal 
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