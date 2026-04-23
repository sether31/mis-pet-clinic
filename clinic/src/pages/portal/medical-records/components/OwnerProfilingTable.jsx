import { useState, useMemo, useEffect } from 'react';
import { HiSearch, HiFolderOpen, HiPhone, HiLocationMarker } from 'react-icons/hi'; // Added HiLocationMarker
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';
import { CiSearch } from 'react-icons/ci';
import NoImage from '../../../../assets/images/no-image.jpg'

const API_URL = import.meta.env.VITE_API_URL;

export default function OwnerProfilingTable({ 
  data = [], 
  onProfile,
  // NEW PROPS for Branch Filtering
  isClinicAdmin,
  branches = [],
  activeBranch,
  onBranchChange
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'owner_name', direction: 'asc' });

  const getAvatarUrl = (name) => {
    const bg = 'd1fae5'; 
    const color = '42756C';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}&bold=true&font-size=0.33`;
  };

  const handleSort = (key) => {
    let direction = 'asc'; 
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    return data
      .filter(r => {
        // 1. BRANCH FILTERING
        // If "all" is selected or user isn't an admin, we might show all or a restricted set based on the API response
        if (!activeBranch || activeBranch === "all") return true;
        
        // Note: Ensure your 'data' objects contain a branch_id or similar field
        return String(r.branch_id) === String(activeBranch);
      })
      .filter(r => {
        // 2. SEARCH FILTERING
        const s = search.toLowerCase();
        return !search ||
          r.owner_name?.toLowerCase().includes(s) ||
          r.phone_number?.includes(s) ||
          r.email?.toLowerCase().includes(s);
      })
      .sort((a, b) => {
        let aV = a[sortConfig.key] || '';
        let bV = b[sortConfig.key] || '';
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, search, sortConfig, activeBranch]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, activeBranch]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <HiChevronUp className="text-slate-900" /> : <HiChevronDown className="text-slate-900" />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden font-sans text-left bg-white border border-gray-300 rounded-xl">
      
      <div className="flex flex-col justify-between gap-4 p-5 bg-white border-b border-gray-300 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-sm font-bold capitalize text-slate-800">Client Records History</h1>
        </div>
        
        <div className="flex flex-col gap-3 md:flex-row">
          <select 
            value={entriesPerPage} 
            onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }} 
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all"
          >
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search client records..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('owner_name')} className="px-6 py-4 border-r border-gray-300 cursor-pointer w-[35%] hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Client Information <SortIcon column="owner_name" /></div>
              </th>
              <th className="px-6 py-4 border-r border-gray-300 w-[30%]">Contact & Communication</th>
              <th className="px-6 py-4 border-r border-gray-300 text-center w-[15%]">Total pets</th>
              <th className="px-6 py-4 text-center w-[20%]">Management</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(owner => (
              <tr key={owner.user_id} className="transition-all hover:bg-gray-50/80 group">
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex items-center gap-4">
                    <img 
                      src={owner.profile_picture ? `${API_URL}/${owner.profile_picture}` : getAvatarUrl(owner.owner_name)} 
                      className="object-cover w-10 h-10 border border-gray-200 rounded-full bg-gray-50"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = getAvatarUrl(owner.owner_name);
                      }}
                      alt={owner.owner_name}
                    />
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[11px] leading-tight group-hover:text-black">{owner.owner_name}</p>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 block">
                        ID: #{owner.user_id} {owner.branch_name ? `• ${owner.branch_name}` : ''}
                      </span>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase">
                      <HiPhone className="text-gray-400" size={12} /> {owner.phone_number || 'N/A'}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium lowercase truncate">{owner.email}</div>
                  </div>
                </td>

                <td className="px-6 py-4 text-center border-r border-gray-300">
                  <span className="inline-block px-3 py-1 bg-gray-200 text-slate-900 rounded-md text-[9px] font-black uppercase border border-gray-300">
                    {owner.pet_count || 0} Patient(s)
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onProfile(owner.user_id, owner.owner_name, owner.profile_picture)} 
                    className="flex items-center justify-center gap-2 px-5 py-2.5 mx-auto text-white transition-all bg-slate-900 rounded-xl cursor-pointer hover:bg-black active:scale-95 group/btn"
                  >
                    <HiFolderOpen size={14} className="transition-transform group-hover/btn:scale-110" />
                    <span className="text-[9px] font-black uppercase tracking-[0.1em]">View History</span>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800">No matching records</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      We couldn't find any clients for the selected branch or search criteria.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-300 bg-gray-50">
        <span className="text-[10px] text-gray-500 font-black uppercase">Total Results: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}