import { useState, useMemo } from 'react';
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiOutlineEye } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

export default function TransactionTable({ data = [], onViewDetails }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date_subscribed', direction: 'desc' });

  // sort
  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  // filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(item => {
        const status = item.status?.toLowerCase();
        if (activeTab === "active") return status === 'active';
        if (activeTab === "expired") return status === 'expired';
        if (activeTab === "unsubscribed") return status === 'unsubscribed';
        return true;
      })
      .filter(item => 
        !search || 
        item.clinic_name?.toLowerCase().includes(search.toLowerCase()) || 
        item.branch_name?.toLowerCase().includes(search.toLowerCase()) ||
        item.plan_name?.toLowerCase().includes(search.toLowerCase())
      );

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'amount') { aVal = Number(aVal); bVal = Number(bVal); }
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
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        
        {/* Tabs */}
        <div className="flex justify-center w-full p-1 bg-gray-100 rounded-lg xl:w-fit">
          {[
            { id: "all", label: "All Clinics" },
            { id: "active", label: "Active" },
            { id: "expired", label: "Expired" },
            { id: "unsubscribed", label: "Unsubscribed" }
          ].map(tab => (
            <button 
              key={tab.id} 
              type="button"
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }} 
              className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* search & entries */}
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <select 
            value={entriesPerPage} 
            onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-gray-400 transition-all"
          >
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search clinic or branch..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-2 focus:ring-(--clr-primary)/20 focus:border-(--clr-primary) transition-all" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[450px]">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('clinic_name')} className="px-6 py-4 transition-colors border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Clinic / Branch <SortIcon column="clinic_name" /></div>
              </th>
              
              <th className="px-6 py-4 border-r border-gray-300 font-bold uppercase tracking-widest text-[10px]">Current Plan</th>

              <th onClick={() => handleSort('amount')} className="px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Total Paid <SortIcon column="amount" /></div>
              </th>

              <th className="px-6 py-4 border-r border-gray-300 text-center font-bold uppercase tracking-widest text-[10px]">Access Status</th>
              
              <th onClick={() => handleSort('date_subscribed')} className="px-6 py-4 text-center border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Expiration Date <SortIcon column="date_subscribed" /></div>
              </th>

              <th className="px-6 py-4 text-center font-bold uppercase tracking-widest text-[10px]">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm bg-white divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(item => (
              <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                <td className="px-6 py-4 border-r border-gray-300">
                  <p className="font-bold leading-tight text-gray-800">{item.clinic_name}</p>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Branch: {item.branch_name}</span>
                </td>

                <td className="px-6 py-4 border-r border-gray-300">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase border bg-indigo-50 text-indigo-600 border-indigo-200">
                    {item.plan_name || 'N/A'}
                  </span>
                </td>

                <td className="px-6 py-4 border-r border-gray-300 font-bold text-(--clr-primary)">
                  ₱{Number(item.amount || 0).toLocaleString()}
                </td>

                <td className="px-6 py-4 text-center border-r border-gray-300">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border transition-colors ${
                    item.status?.toLowerCase() === 'active' 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : item.status?.toLowerCase() === 'expired'
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : 'bg-gray-100 text-gray-500 border-gray-300'
                  }`}>
                    {item.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-center border-r border-gray-300 text-[11px] font-bold text-gray-500 uppercase">
                  {item.expiration_date 
                    ? new Date(item.expiration_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
                    : '--'
                  }
                </td>

                <td className="px-6 py-4 text-center">
                  <button 
                    type="button"
                    onClick={() => onViewDetails(item)}
                    className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-90"
                    title="View Full History"
                  >
                    <HiOutlineEye size={18}/>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="mt-4 font-bold text-gray-800">
                      No {activeTab === 'all' ? 'clinics' : activeTab} found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}".`
                        : "There are no transaction records matching this criteria."}
                    </p>
                    {search && (
                      <button type="button" onClick={() => setSearch('')} className="mt-4 text-sm font-bold text-(--clr-primary) hover:underline cursor-pointer transition-all active:scale-95">
                        Clear search filters
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
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}