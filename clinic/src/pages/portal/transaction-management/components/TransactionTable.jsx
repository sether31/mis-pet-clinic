import { useState, useMemo, useEffect } from 'react';
// images (Make sure this path is correct for your project structure)
import NoImage from '../../../../assets/images/no-image.jpg';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiOutlineEye } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionTable({ data = [], loading, onViewDetails, isGlobalView }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });

  // 👇 Media Helper
  const getMediaUrl = (path) => {
    if (!path) return NoImage;
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path}`;
  };

  // sorting
  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
    setSortConfig({ key, direction });
  };

  // filter and sort
  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(item => {
        const status = item.transaction_status?.toLowerCase();
        if (activeTab === "paid") return status === 'paid' || status === 'completed';
        if (activeTab === "unpaid") return status === 'unpaid' || status === 'pending';
        if (activeTab === "appointment") return item.source_type === 'Appointment';
        if (activeTab === "retail") return item.source_type === 'Retail/Product';
        return true;
      })
      .filter(item => {
        if (customerTypeFilter === 'guest') return !item.owner_name;
        if (customerTypeFilter === 'user') return !!item.owner_name;
        return true; 
      })
      .filter(item => {
        const customerName = item.owner_name || "Guest Walk-in";
        return !search || 
          item.transaction_id?.toString().includes(search.toLowerCase()) || 
          customerName.toLowerCase().includes(search.toLowerCase()) ||
          (item.pet_name && item.pet_name.toLowerCase().includes(search.toLowerCase())) ||
          item.branch_name?.toLowerCase().includes(search.toLowerCase());
      });

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
  }, [data, activeTab, search, sortConfig, customerTypeFilter]);

  // pagination Logic
  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage, sortConfig, customerTypeFilter]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
      {/* header */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        
        {/* tabs */}
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
              onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }} 
              className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* search entries */}
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          
          <div className="flex items-center gap-2">
            <select 
              value={entriesPerPage} 
              onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-gray-400 transition-all"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
            </select>

            <select 
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-gray-400 transition-all"
            >
              <option value="all">All Customers</option>
              <option value="user">User Only</option>
              <option value="guest">Guests Only</option>
            </select>
          </div>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search by ID, owner, or pet..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-2 focus:ring-(--clr-primary)/20 focus:border-(--clr-primary) transition-all" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* main table */}
      <div className="overflow-x-auto min-h-[450px]">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('transaction_id')} className="px-6 py-4 transition-colors border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Transaction ID <SortIcon column="transaction_id" /></div>
              </th>

              {isGlobalView && (
                <th className="px-6 py-4 border-r border-gray-300 text-gray-600 font-bold uppercase tracking-widest text-[10px]">
                  Branch
                </th>
              )}

              <th className="px-6 py-4 border-r border-gray-300 font-bold uppercase tracking-widest text-[10px]">Customer & Pet</th>
              <th className="px-6 py-4 border-r border-gray-300 font-bold uppercase tracking-widest text-[10px]">Type</th>
              
              <th onClick={() => handleSort('amount')} className="px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Amount <SortIcon column="amount" /></div>
              </th>

              <th className="px-6 py-4 border-r border-gray-300 text-center font-bold uppercase tracking-widest text-[10px]">Status</th>
              
              <th onClick={() => handleSort('transaction_date')} className="px-6 py-4 text-center border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Date <SortIcon column="transaction_date" /></div>
              </th>

              <th className="px-6 py-4 text-center font-bold uppercase tracking-widest text-[10px]">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm bg-white divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(trx => (
              <tr key={trx.transaction_id} className="transition-colors hover:bg-blue-50/30">
                <td className="px-6 py-4 font-bold text-gray-800 border-r border-gray-300">#transac-{trx.transaction_id}</td>
                
                {isGlobalView && (
                  <td className="px-6 py-4 border-r border-gray-300">
                    <span className="text-[10px] font-black px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase tracking-tighter">
                      {trx.branch_name}
                    </span>
                  </td>
                )}

                <td className="px-6 py-4 border-r border-gray-300">
                  {/* 👇 ADDED IMAGES HERE */}
                  <div className="flex items-center gap-3">
                    <img 
                      src={getMediaUrl(trx.pet_image || trx.user_image)} 
                      className="object-cover w-10 h-10 border-2 border-gray-100 rounded-full bg-gray-50 shrink-0" 
                      onError={(e) => e.target.src = NoImage} 
                      alt=""
                    />
                    <div>
                      <p className={`font-bold leading-tight capitalize ${trx.owner_name ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                        {trx.owner_name || "Guest Walk-in"}
                      </p>
                      {trx.pet_name && (
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5 block">
                          Pet: {trx.pet_name}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 border-r border-gray-300">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${trx.source_type === 'Appointment' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                    {trx.source_type}
                  </span>
                  <p className="mt-1 text-xs capitalize font-medium text-gray-600 truncate max-w-[150px]">
                    {trx.items && trx.items.length > 0 && trx.items[0].service_name 
                      ? trx.items[0].service_name 
                      : trx.source_type === 'Retail/Product' 
                        ? 'Retail Purchase' 
                        : ''}
                  </p>
                </td>

                <td className="px-6 py-4 border-r border-gray-300 font-bold text-(--clr-primary)">
                  ₱{Number(trx.amount).toLocaleString()}
                </td>

                <td className="px-6 py-4 text-center border-r border-gray-300">
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border transition-colors ${
                    trx.transaction_status?.toLowerCase() === 'paid' || trx.transaction_status?.toLowerCase() === 'completed'
                      ? 'bg-green-50 text-(--clr-primary) border-green-200' 
                      : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {trx.transaction_status?.toLowerCase() === 'paid' || trx.transaction_status?.toLowerCase() === 'completed' ? 'Paid' : 'Unpaid'}
                  </span>
                </td>

                <td className="px-6 py-4 text-center border-r border-gray-300 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {new Date(trx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                </td>

                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onViewDetails(trx)} 
                    className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-90"
                  >
                    <HiOutlineEye size={18}/>
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={isGlobalView ? 8 : 7} className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    
                    <h3 className="mt-4 font-bold text-gray-800">
                      No {activeTab === 'all' ? 'transactions' : `${activeTab}`} found
                    </h3>
                    
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in your ${activeTab} transactions.`
                        : activeTab === 'all' 
                          ? "There are no billing records recorded in this branch yet."
                          : `There are currently no transactions marked as ${activeTab}.`}
                    </p>

                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="mt-4 text-sm font-bold text-(--clr-primary) hover:underline cursor-pointer transition-all active:scale-95"
                      >
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
        <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-20 cursor-pointer active:scale-95 transition-all"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border border-gray-300 rounded-lg disabled:opacity-20 cursor-pointer active:scale-95 transition-all"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}