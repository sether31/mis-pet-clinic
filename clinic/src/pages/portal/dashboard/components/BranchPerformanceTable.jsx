import { useState, useMemo, useEffect } from 'react';
import LoaderV2 from '../../../../components/LoaderV2';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiSearch } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown, HiOutlineBuildingOffice2 } from 'react-icons/hi2';

export default function BranchPerformanceTable({ data = [], isLoading, timeFilter }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  // Sorting state (Defaults to showing highest earners first)
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = data.filter(item => 
      !search || 
      item.name?.toLowerCase().includes(search.toLowerCase()) || 
      String(item.branch_id).includes(search)
    );

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if(['branch_id', 'appts', 'reservations', 'revenue'].includes(sortConfig.key)) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [timeFilter, search, entriesPerPage, sortConfig]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  return (
    <div className="relative flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
      
      {isLoading && <LoaderV2 />}

      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 p-5 bg-white border-b border-gray-300 xl:flex-row xl:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black tracking-wider text-gray-800 uppercase">
            <HiOutlineBuildingOffice2 className="text-lg text-blue-600" />
            Branch Performance Breakdown
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Detailed Metrics ({timeFilter})
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <select 
            value={entriesPerPage} 
            onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
            className="px-2 py-2 text-xs font-bold transition-all border border-gray-300 rounded-lg outline-none cursor-pointer bg-gray-50 hover:border-black"
          >
            {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
          </select>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              placeholder="Search branch name or ID..." 
              className="w-full md:w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('branch_id')} className="w-[10%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Branch ID <SortIcon column="branch_id" /></div>
              </th>
              <th onClick={() => handleSort('name')} className="w-[20%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Branch Name <SortIcon column="name" /></div>
              </th>
              <th onClick={() => handleSort('appts')} className="w-[12%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Appointments <SortIcon column="appts" /></div>
              </th>
              <th onClick={() => handleSort('reservations')} className="w-[12%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Reservations <SortIcon column="reservations" /></div>
              </th>
              <th onClick={() => handleSort('revenue')} className="w-[15%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Revenue <SortIcon column="revenue" /></div>
              </th>
              {/* REMOVED onClick AND SORT ICON HERE */}
              <th className="w-[15%] px-6 py-4 border-r border-gray-300 text-center">
                <div className="flex items-center justify-center gap-2">Sub Status</div>
              </th>
              {/* REMOVED onClick AND SORT ICON HERE */}
              <th className="w-[16%] px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">Branch Status</div>
              </th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(branch => (
              <tr key={branch.branch_id} className="transition-colors hover:bg-gray-50/80 even:bg-gray-50/30">
                <td className="px-6 py-4 text-xs font-bold text-gray-500 border-r border-gray-300">#{branch.branch_id}</td>
                <td className="px-6 py-4 font-bold text-gray-800 border-r border-gray-300">{branch.name}</td>
                <td className="px-6 py-4 font-medium text-center text-gray-600 border-r border-gray-300">{branch.appts}</td>
                <td className="px-6 py-4 font-medium text-center text-gray-600 border-r border-gray-300 bg-purple-50/20">
                  {branch.reservations}
                </td>
                <td className="px-6 py-4 font-black text-(--clr-primary) border-r border-gray-300">
                  ₱{Number(branch.revenue).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-300">
                  <span className={`px-2 py-1 text-[9px] font-black tracking-wide uppercase rounded border ${
                    branch.sub_status === 'Active' ? 'bg-green-50 text-(--clr-primary) border-green-200' : 'bg-red-50 text-red-500 border-red-200'
                  }`}>
                    {branch.sub_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-[9px] font-black tracking-wide uppercase rounded border ${
                    branch.status.toLowerCase() === 'approved' || branch.status.toLowerCase() === 'active' 
                    ? 'bg-blue-50 text-blue-600 border-blue-200' 
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    {branch.status}
                  </span>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="mt-2 font-bold text-gray-800">No branches found</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 transition-all bg-white border rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-100">
            <HiChevronLeft/>
          </button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 transition-all bg-white border rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-100">
            <HiChevronRight/>
          </button>
        </div>
      </div>
    </div>
  );
}