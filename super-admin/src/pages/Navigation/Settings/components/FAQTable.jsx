import { useState, useMemo, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import { 
  HiSearch, 
  HiPencilAlt, 
  HiPlus, 
  HiArchive, 
  HiRefresh 
} from 'react-icons/hi';
import { 
  HiChevronLeft, 
  HiChevronRight, 
  HiChevronUp, 
  HiChevronDown 
} from 'react-icons/hi2';

export default function FAQTable({ data = [], onEdit, onToggleStatus, onCreate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  const [sortConfig, setSortConfig] = useState({ key: 'sort_order', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc'; 
    if(sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...data]
      .filter(f => {
        if (activeTab === "all") return true;
        return activeTab === "active" ? Number(f.status) === 1 : Number(f.status) === 0;
      })
      .filter(f => 
        !search || 
        f.question?.toLowerCase().includes(search.toLowerCase()) || 
        f.answer?.toLowerCase().includes(search.toLowerCase())
      );

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if(sortConfig.key === 'sort_order') {
          aValue = parseInt(aValue) || 0;
          bValue = parseInt(bValue) || 0;
        } else {
          aValue = String(aValue || '').toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }
        
        if(sortConfig.direction === 'desc') {
          return bValue > aValue ? 1 : -1; 
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }
    return result;
  }, [data, activeTab, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <HiChevronDown className="ml-1 opacity-20" size={14} />;
    return sortConfig.direction === 'desc' 
      ? <HiChevronUp className="ml-1 text-(--clr-primary) scale-110" size={14} /> 
      : <HiChevronDown className="ml-1 text-(--clr-primary) scale-110" size={14} />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
      {/* Table Header Controls */}
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 lg:flex-row">
        <div className="flex justify-center p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[{id:"all", label:"All"}, {id:"active", label: "Active"}, {id:"inactive", label: "Archived"}].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id)} 
              className={`px-6 py-2 text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <select 
            value={entriesPerPage} 
            onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
            className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer"
          >
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search FAQ..." 
              className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-(--clr-primary)" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <button onClick={onCreate} className="px-6 py-2 bg-(--clr-primary) text-white text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 hover:opacity-90 cursor-pointer">
            <HiPlus/> Add FAQ
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
              <th onClick={() => handleSort('sort_order')} className="w-[10%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center">Order <SortIcon columnKey="sort_order" /></div>
              </th>
              <th onClick={() => handleSort('question')} className="w-[65%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">FAQ Content <SortIcon columnKey="question" /></div>
              </th>
              <th className="w-[12%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[13%] px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(faq => (
              <tr key={faq.accordion_id} className="hover:bg-gray-200/50 transition-colors">
                <td className="px-6 py-4 border-r border-gray-300 text-center font-black text-gray-400 text-xs">
                  #{faq.sort_order}
                </td>
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex flex-col">
                    <span className="font-black text-gray-800 uppercase text-[11px] leading-tight mb-1">{faq.question}</span>
                    <span className="text-[10px] text-gray-400 font-bold line-clamp-2">{faq.answer}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                  <span className={`px-2 py-1 rounded border ${Number(faq.status) === 1 ? 'bg-green-50 text-(--clr-primary) border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                    {Number(faq.status) === 1 ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(faq)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-black transition-all">
                      <HiPencilAlt size={16}/>
                    </button>
                    <button onClick={() => onToggleStatus(faq)} className={`p-2 bg-white border border-gray-300 rounded-lg cursor-pointer transition-all group ${Number(faq.status) === 1 ? 'hover:border-red-500' : 'hover:border-(--clr-primary)'}`}>
                      {Number(faq.status) === 1 ? <HiArchive size={16} className="text-gray-600 group-hover:text-red-500"/> : <HiRefresh size={16} className="text-gray-600 group-hover:text-(--clr-primary)"/>}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800 mt-2">No {activeTab === 'all' ? '' : activeTab} FAQ found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                        : `There are currently no FAQs marked as ${activeTab}.`}
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
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">
          Total: {filteredAndSorted.length}
        </span>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p-1))} 
            disabled={currentPage === 1} 
            className="p-2 bg-white border rounded-lg disabled:opacity-20 cursor-pointer"
          >
            <HiChevronLeft/>
          </button>
          <span className="px-4 text-[10px] font-black uppercase text-gray-600">
            {currentPage} / {totalPages || 1}
          </span>
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} 
            disabled={currentPage >= totalPages} 
            className="p-2 bg-white border rounded-lg disabled:opacity-20 cursor-pointer"
          >
            <HiChevronRight/>
          </button>
        </div>
      </div>
    </div>
  );
}