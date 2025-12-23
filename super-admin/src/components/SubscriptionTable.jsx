import { useState, useMemo, useEffect } from 'react';
import { 
  HiSearch,HiPencilAlt, HiPlus, HiArchive, 
  HiRefresh, HiChevronUp, HiChevronDown
} from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function SubscriptionTable({ data = [], onEdit, onToggleStatus, onCreate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5); 

  // Simple sort state: 'asc' or 'desc'
  const [sortPrice, setSortPrice] = useState('asc');

  // filtering and sorting with memo
  const filtered = useMemo(() => {
    // filter
    let result = data
      .filter(p => {
        if (activeTab === "all") return true;
        return activeTab === "active" ? Number(p.is_active) === 1 : Number(p.is_active) === 0;
      })
      .filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

    // 2. sort by price
    result.sort((a, b) => {
      return sortPrice === 'asc' ? a.price - b.price : b.price - a.price;
    });

    return result; 
  }, [data, activeTab, search, sortPrice]); 

  // pagination
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filtered.length / entriesPerPage);

  // so at every mount it will be set to current page one
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage]);

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 shadow-sm rounded-xl">
      {/* table header */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 lg:flex-row">
        
        {/* tabs */}
        <div className="flex p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[
            {id:"all", label:"All" },
            {id:"active", label:"Active" }, 
            {id:"archived", label:"Archived" }
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
        
        
        <div className="flex items-center gap-3">
          {/* entries */}
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer">
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>


          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm w-64 outline-none focus:bg-white focus:border-[var(--clr-primary)] transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <button 
            onClick={onCreate} 
            className="px-6 py-2 bg-[var(--clr-primary)] text-[var(--clr-text-secondary)] text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--clr-primary)]/95 transition-all cursor-pointer"
          >
            <HiPlus/> New Plan
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left table-fixed">
          {/* table head */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th className="w-[25%] px-6 py-4 border-r border-gray-300">Plan Name</th>
              <th className="w-[40%] px-6 py-4 border-r border-gray-300">Features</th>
              <th 
                className="w-[15%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group"
                onClick={() => setSortPrice(sortPrice === 'asc' ? 'desc' : 'asc')}
              >
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <span className="text-gray-400 group-hover:text-[var(--clr-primary)]">
                    {sortPrice === 'asc' ? <HiChevronUp size={16} /> : <HiChevronDown size={16} />}
                  </span>
                </div>
              </th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[10%] px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          
          {/* table body */}
          <tbody className="divide-y divide-gray-200">
            {/* check data */}
            {paginated.length > 0 ? paginated.map(plan => (
              <tr key={plan.subscription_id} className="hover:bg-gray-200/50 even:bg-gray-200/50">
                
                {/* subscription name */}
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="text-sm font-bold text-gray-800">{plan.name}</div>
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    {plan.duration_months} {Number(plan.duration_months) === 1 ? 'Month' : 'Months'}
                  </div>
                </td>

                {/* features */}
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex flex-wrap justify-start gap-2">
                    <span className="px-2 py-1 bg-gray-100 border border-gray-200 text-[9px] font-black text-gray-600 rounded uppercase">
                      {Number(plan.appointment_limit) > 1000 ? 'Unlimited' : plan.appointment_limit} Appointments
                    </span>
                    {Number(plan.has_marketplace) === 1 && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black rounded uppercase">
                        Marketplace
                      </span>
                    )}
                    {Number(plan.has_unlimited_email) === 1 && (
                      <span className="px-2 py-1 bg-green-50 text-[var(--clr-text-header)] border-green-100 text-[9px] font-black rounded uppercase">
                        Email
                      </span>
                    )}
                  </div>
                </td>

                {/* price */}
                <td className="px-6 py-4 text-sm font-black text-center text-gray-800 border-r border-gray-300">
                  ₱{Number(plan.price).toLocaleString()}
                </td>

                {/* status */}
                <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                  <span className={`px-2 py-1 rounded border ${
                    Number(plan.is_active) === 1 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {Number(plan.is_active) === 1 ? 'Active' : 'Archived'}
                  </span>
                </td>

                {/* actions */}
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    {/* edit */}
                    <button onClick={() => onEdit(plan)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:text-[var(--clr-text-header)] hover:border-[var(--clr-primary)]">
                      <HiPencilAlt size={16}/>
                    </button>

                    <button onClick={() => onToggleStatus(plan)} className={`p-2 border border-gray-300 rounded-lg cursor-pointer bg-white ${
                        Number(plan.is_active) === 1 ? 'hover:text-red-600 hover:border-red-600' : 'hover:text-[var(--clr-text-header)] hover:border-[var(--clr-primary)]'
                      }`}>
                      {Number(plan.is_active) === 1 ? <HiArchive size={16}/> : <HiRefresh size={16}/>}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              // without data
              <tr>
                <td colSpan="5" className="py-24 text-xs font-bold tracking-widest text-center text-gray-400 uppercase">
                  No subscription found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- table footer --- */}
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
    </div>
  );
}