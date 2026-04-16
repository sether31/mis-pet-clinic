import { useState, useMemo, useEffect } from 'react';
import NoImage from '../../../../assets/images/no-image.jpg';
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiOutlineEye } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionTable({ data = [], loading, onViewDetails, isGlobalView, isClinicAdmin = false }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'owner_name', direction: 'asc' });

  // Media Helper - Now looks at the profile level
  const getAvatarUrl = (profile) => {
    const path = profile.user_image;
    if (path) {
      if (path.startsWith('http')) return path;
      return `${API_URL}/${path}`;
    }
    const seedName = profile.owner_name || "Guest";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(seedName)}&background=d1fae5&color=42756C&bold=true`;
  };

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = data.filter(profile => {
      const name = profile.owner_name || "Guest Walk-in";
      const matchesSearch = !search || 
        name.toLowerCase().includes(search.toLowerCase()) ||
        profile.owner_email?.toLowerCase().includes(search.toLowerCase());

      // Filter by Tab (Checking if any transaction in their history matches the type)
      if (activeTab === "all") return matchesSearch;
      
      return matchesSearch && profile.history.some(trx => {
        const status = trx.transaction_status?.toLowerCase();
        if (activeTab === "paid") return status === 'paid' || status === 'completed';
        if (activeTab === "unpaid") return status === 'unpaid' || status === 'pending';
        if (activeTab === "appointment") return trx.source_type === 'Appointment';
        if (activeTab === "retail") return trx.source_type === 'Retail/Product';
        return true;
      });
    });

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'total_spent') { aVal = Number(aVal); bVal = Number(bVal); }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, activeTab, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
      {/* Header Controls */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        <div className="flex justify-center w-full p-1 bg-gray-100 rounded-lg xl:w-fit">
          {[
            { id: "all", label: "All" },
            { id: "paid", label: "Paid" },
            { id: "unpaid", label: "Unpaid" },
            { id: "appointment", label: "Service" },
            { id: "retail", label: "Products" }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={entriesPerPage} 
            onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none"
          >
            {[5, 10, 20].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search owner or email..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring focus:ring-black" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('owner_name')} className="px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Customer Profile <SortIcon column="owner_name" /></div>
              </th>
              {isClinicAdmin && <th className="px-6 py-4 border-r border-gray-300">Branch Name</th>}
              <th className="px-6 py-4 border-r border-gray-300 text-center">Transactions</th>
              <th onClick={() => handleSort('total_spent')} className="px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 text-right">
                <div className="flex items-center justify-end gap-2">Total Value <SortIcon column="total_spent" /></div>
              </th>
              <th className="px-6 py-4 text-center font-bold uppercase tracking-widest text-[10px]">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(profile => (
              <tr key={profile.user_id || profile.owner_name} className="transition-colors hover:bg-blue-50/30">
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex items-center gap-3">
                    <img src={getAvatarUrl(profile)} className="w-10 h-10 rounded-full border border-gray-200" alt="avatar" />
                    <div>
                      <p className={`font-bold leading-tight uppercase ${profile.user_id ? 'text-gray-800' : 'text-gray-400'}`}>
                        {profile.owner_name || "Guest Walk-in"}
                      </p>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{profile.owner_email || 'No Email Linked'}</span>
                    </div>
                  </div>
                </td>
                {isClinicAdmin && (
                  <td className="px-6 py-4 border-r border-gray-300">
                    <span className="text-[10px] font-black px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase">
                      {profile.branch_name}
                    </span>
                  </td>
                )}
                <td className="px-6 py-4 text-center border-r border-gray-300 font-bold text-gray-600">
                  {profile.transaction_count}
                </td>
                <td className="px-6 py-4 border-r border-gray-300 font-black text-right text-(--clr-primary)">
                  ₱{Number(profile.total_spent).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onViewDetails(profile)} 
                    className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-90"
                  >
                    <HiOutlineEye size={18}/>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab} transaction records found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                        : `There are currently no transaction records marked as ${activeTab}.`}
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

      {/* Pagination Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center">
        <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Total Profiles: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}