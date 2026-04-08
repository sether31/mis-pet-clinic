import { useState, useMemo, useEffect } from 'react';
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiPencilAlt, HiPlus, HiArchive, HiRefresh } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

export default function ServiceTable({ data = [], onEdit, onToggleStatus, onCreate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc'; 
    if(sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...data]
      .filter(s => {
        if (activeTab === "all") return true;
        return activeTab === "active" ? Number(s.status) === 1 : Number(s.status) === 0;
      })
      .filter(s => 
        !search || 
        s.name?.toLowerCase().includes(search.toLowerCase()) || 
        s.description?.toLowerCase().includes(search.toLowerCase())
      );

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if(['price', 'duration'].includes(sortConfig.key)) {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (sortConfig.key === 'created_at') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
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
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 lg:flex-row">
        {/* header */}
        <div className="flex justify-center p-1 bg-gray-100 rounded-lg lg:w-fit">
          {[{id:"all", label:"All"}, {id:"active", label: "Active"}, {id:"inactive", label: "Inactive"}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-2 text-xs font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"}`}>{tab.label}</button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* entries */}
          <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer">
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>
          {/* search */}
          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search service..." className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:bg-white focus:ring-1 focus:ring-(--clr-primary)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {/* add service */}
          <button onClick={onCreate} className="px-6 py-2 bg-(--clr-primary) text-white text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 hover:opacity-90">
            <HiPlus/> Add Service
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          {/* table head */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600 select-none">
              {/* sort name */}
              <th onClick={() => handleSort('name')} className="w-[40%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center">Service Name <SortIcon columnKey="name" /></div>
              </th>
              {/* sort price */}
              <th onClick={() => handleSort('price')} className="w-[12%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center">Price <SortIcon columnKey="price" /></div>
              </th>
              {/* sort duration */}
              <th onClick={() => handleSort('duration')} className="w-[12%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center">Duration <SortIcon columnKey="duration" /></div>
              </th>
              {/* sort date */}
              <th onClick={() => handleSort('created_at')} className="w-[13%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center">Date Added <SortIcon columnKey="created_at" /></div>
              </th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[13%] px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(service => (
              <tr key={service.service_id} className="hover:bg-gray-200/50 transition-colors">
                <td className="px-6 py-4 border-r border-gray-300">
                  <div className="flex flex-col">
                    <span className="font-black text-gray-800 uppercase text-[11px]">{service.name}</span>
                    <span className="text-[9px] text-gray-400 font-bold uppercase italic line-clamp-1">{service.description || 'No description provided'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 border-r border-gray-300 text-center font-black text-gray-700">₱{Number(service.price).toLocaleString()}</td>
                <td className="px-6 py-4 border-r border-gray-300 text-center text-[10px] font-bold text-gray-500 uppercase">{service.duration}m</td>
                <td className="px-6 py-4 border-r border-gray-300 text-center text-[10px] font-bold text-gray-400 uppercase">
                  {service.created_at ? new Date(service.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                </td>
                
                {/* check status */}
                <td className="px-6 py-4 border-r border-gray-300 text-center uppercase font-black text-[9px]">
                  <span className={`px-2 py-1 rounded border ${Number(service.status) === 1 ? 'bg-green-50 text-(--clr-primary) border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                    {Number(service.status) === 1 ? 'Active' : 'Inactive'}
                  </span>
                </td>
                
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button onClick={() => onEdit(service)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-black transition-all"><HiPencilAlt size={16}/></button>
                    <button onClick={() => onToggleStatus(service)} className={`p-2 bg-white border border-gray-300 rounded-lg cursor-pointer transition-all ${Number(service.status) === 1 ? 'hover:border-red-600 hover:text-red-600' : 'hover:border-(--clr-primary) hover:text-(--clr-primary)'}`}>
                      {Number(service.status) === 1 ? <HiArchive size={16}/> : <HiRefresh size={16}/>}
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab} Service found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                        : `There are currently no service marked as ${activeTab}.`}
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
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronLeft/></button>
          <span className="px-4 text-[10px] font-black uppercase">{currentPage}/{totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg disabled:opacity-20"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}