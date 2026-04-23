import { useState, useMemo, useEffect } from 'react';
// icons
import { HiSearch, HiEye, HiClipboardList, HiFilter, HiLocationMarker } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';
import { CiSearch } from 'react-icons/ci';
import NoImage from '../../../../assets/images/no-image.jpg'

const API_URL = import.meta.env.VITE_API_URL;

export default function MedicalRecordTable({ data = [], branchesList = [], onView, userRole }) {
  const [activeTab, setActiveTab] = useState("all"); 
  const [recordTypeFilter, setRecordTypeFilter] = useState("all"); 
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'start_time', direction: 'desc' });

  const getAvatarUrl = (name) => {
    const bg = 'd1fae5';
    const color = '42756C';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}&bold=true`;
  };

  const branches = useMemo(() => {
    if (branchesList && branchesList.length > 0) {
      return branchesList; 
    }
    
    const uniqueMap = new Map();
    data.forEach(item => {
      if (item.branch_id) uniqueMap.set(item.branch_id, item.branch_name);
    });
    
    return Array.from(uniqueMap.entries()).map(([id, name]) => ({
      branch_id: id,
      name: name
    }));
}, [data, branchesList]);

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    return data
      .filter(r => {
        const rawStatus = r.status?.toLowerCase().trim() || "unrecorded";
        const isRecorded = rawStatus === "recorded";
        
        if (activeTab === "unrecorded") return !isRecorded;
        if (activeTab === "recorded") return isRecorded;
        return true;
      })
      .filter(r => {
        if (recordTypeFilter === "all") return true;
        
        const rType = r.record_type?.toLowerCase().trim() || "";
        
        if (recordTypeFilter === "medical") return rType === "medical";
        if (recordTypeFilter === "non_medical") return rType === "non_medical";
        
        // If user selects "Unrecorded" type from dropdown
        if (recordTypeFilter === "unrecorded") {
          return rType === "" || rType === "unset" || rType === "unrecorded";
        }
        
        return true;
      })
      .filter(r => {
        // 3. BRANCH FILTER
        if (branchFilter === "all") return true;
        return String(r.branch_id) === String(branchFilter);
      })
      .filter(r => {
        // 4. SEARCH FILTER
        const s = search.toLowerCase();
        return !search ||
          r.pet_name?.toLowerCase().includes(s) ||
          r.owner_name?.toLowerCase().includes(s) ||
          r.phone_number?.includes(s);
      })
      .sort((a, b) => {
        // 5. SORTING
        let aV = a[sortConfig.key] || '';
        let bV = b[sortConfig.key] || '';
        if (sortConfig.key === 'start_time') {
          aV = new Date(aV).getTime();
          bV = new Date(bV).getTime();
        }
        if (aV < bV) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aV > bV) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [data, activeTab, recordTypeFilter, branchFilter, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeTab, recordTypeFilter, branchFilter, search]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-slate-900" /> : <HiChevronDown className="text-slate-900" />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden font-sans text-left bg-white border border-gray-300 rounded-xl">
      
      {/* tabs */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        <div className="flex justify-center w-full p-1 bg-gray-100 rounded-lg xl:w-fit">
          {["all", "unrecorded", "recorded"].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`px-8 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer ${
                activeTab === tab 
                  ? "bg-(--clr-primary) text-white" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* filter */}
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <div className="flex gap-3">
            {/* entries */}
            <select 
              value={entriesPerPage} 
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }} 
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
            </select>

            {/* record type */}
            <div className="relative">
              <select 
                value={recordTypeFilter} 
                onChange={(e) => setRecordTypeFilter(e.target.value)} 
                className="border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all min-w-[140px]"
              >
                <option value="all">All Types</option>
                <option value="medical">Medical</option>
                <option value="non_medical">Non-Medical</option>
                <option value="unrecorded">Unrecorded</option> 
              </select>
              <HiFilter className="absolute text-gray-400 -translate-y-1/2 left-2.5 top-1/2" size={14} />
            </div>
          </div>

          {/* search*/}
          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search records..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[450px]">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('pet_name')} className="px-6 py-4 border-r border-gray-300 cursor-pointer w-[12%] hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Patient <SortIcon column="pet_name" /></div>
              </th>
              <th className="px-6 py-4 border-r border-gray-300 w-[13%]">Owner</th>
              <th onClick={() => handleSort('start_time')} className="px-6 py-4 border-r border-gray-300 cursor-pointer w-[13%] text-center">
                <div className="flex items-center justify-center gap-2">Date <SortIcon column="start_time" /></div>
              </th>
              <th className="px-6 py-4 border-r border-gray-300 w-[12%]">Service</th>
              <th className="px-6 py-4 border-r border-gray-300 w-[12%]">Staff</th>
              <th className="px-6 py-4 border-r border-gray-300 text-center w-[14%]">Branch</th>
              <th className="px-6 py-4 border-r border-gray-300 text-center w-[10%]">Status</th>
              <th className="px-6 py-4 text-center w-[8%]">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(record => (
              <tr key={record.appointment_id} className="transition-colors hover:bg-gray-50/80 even:bg-gray-50/30">
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex items-center gap-3">
                    <img 
                      src={record.pet_picture 
                        ? `${API_URL}/${record.pet_picture}` 
                        : getAvatarUrl(record.pet_name)
                      } 
                      className="object-cover w-10 h-10 border rounded-lg border-emerald-100 bg-emerald-50"
                      onError={(e) => { e.target.onerror = null; e.target.src = NoImage; }}
                      alt=""
                    />
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[11px] leading-tight">{record.pet_name}</p>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">{record.pet_species || 'Patient'}</span>
                    </div>
                  </div>
                </td>
                
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <img 
                      src={record.owner_picture 
                        ? `${API_URL}/${record.owner_picture}` 
                        : getAvatarUrl(record.owner_name)
                      } 
                      className="object-cover w-10 h-10 border border-gray-200 rounded-full bg-gray-50"
                      onError={(e) => { e.target.onerror = null; e.target.src = NoImage; }}
                      alt=""
                    />
                    <div className="flex flex-col min-w-0">
                      <p className="text-[10px] font-black uppercase text-gray-800 truncate">{record.owner_name}</p>
                      <span className="text-[9px] text-gray-400 font-bold italic truncate">{record.phone_number || 'No Phone'}</span>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 text-center text-gray-600 border-r border-gray-300 text-[10px] font-black uppercase">
                  {new Date(record.start_time).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
                </td>
                <td className="px-6 py-4 border-r border-gray-300 text-gray-600 text-[10px] font-black uppercase">{record.service_name_at_time || record.current_service_name}</td>
                <td className="px-6 py-4 border-r border-gray-300">
                  <p className="text-[10px] font-black uppercase text-gray-600 truncate">{record.staff_name}</p>
                </td>
                <td className="px-6 py-4 border-r border-gray-300">
                  <p className="text-[10px] font-black text-gray-600 uppercase truncate">{record.branch_name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter truncate">
                      ID: #{record.branch_id}
                    </span>
                    <span className="text-[8px] text-slate-300">•</span>
                    <span className="text-[8px] text-(--clr-primary) font-black uppercase italic truncate">
                      {record.municipality || "City"}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-center border-r border-gray-300">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${record.status?.toLowerCase() === 'recorded' ? 'bg-green-50 text-(--clr-primary) border-green-100' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                    {record.status?.toLowerCase() === 'recorded' ? 'Recorded' : 'Unrecorded'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => onView(record)} className="h-8 w-8 mx-auto rounded-lg gap-2 font-black text-[9px] uppercase text-gray-700 hover:text-(--clr-primary) flex items-center cursor-pointer justify-center border border-gray-300 hover:border-(--clr-primary)">
                    {record.status?.toLowerCase() === 'recorded' ? <HiEye size={16} /> : <HiClipboardList size={16} />}
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab} medical records found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                        : `There are currently no medical records marked as ${activeTab}.`}
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
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-300 bg-gray-50">
        <span className="text-[10px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}