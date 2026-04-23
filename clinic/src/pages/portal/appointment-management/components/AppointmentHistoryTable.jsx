import { useState, useMemo, useEffect } from 'react';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiOutlineEye } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';

// TODO: Adjust this import path to point to your actual modal file
import AppointmentHistoryModal from './AppointmentHistoryModal'; 

const API_URL = import.meta.env.VITE_API_URL;

export default function AppointmentHistoryTable({ data = [], onReview }) {
  const [activeTab, setActiveTab] = useState("all"); 
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10); 
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc'});

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const getFallbackAvatar = (name) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Pet")}&background=d1fae5&color=42756C&bold=true`;
  };

  const getMediaUrl = (path, petName) => {
    if (!path) return getFallbackAvatar(petName);
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path}`;
  };

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-30" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  const handleOpenModal = (appt) => {
    setSelectedAppointment(appt);
    setIsModalOpen(true);
    if (onReview) onReview(appt);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(appt => activeTab === "all" ? true : appt.status === activeTab)
      .filter(appt => {
        const ownerName = appt.owner_name || "";
        const petName = appt.pet_name || "";
        const serviceName = appt.service_names || ""; // Updated key
        
        return !search || 
          ownerName.toLowerCase().includes(search.toLowerCase()) || 
          petName.toLowerCase().includes(search.toLowerCase()) || 
          serviceName.toLowerCase().includes(search.toLowerCase()) ||
          appt.id?.toString().includes(search);
      });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Match sorting for IDs and Fees
        if (sortConfig.key === 'total_service_fee' || sortConfig.key === 'id') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        if (sortConfig.key === 'start') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result; 
  }, [data, activeTab, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage, sortConfig]);

  return (
    <>
      <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
        {/* Header Controls */}
        <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
          <div className="flex justify-center w-full p-1 overflow-x-auto bg-gray-100 rounded-lg xl:w-fit scrollbar-hide">
            {["all", "pending", "confirmed", "billed", "completed", "rejected", "cancelled"].map(tabId => (
              <button 
                key={tabId} 
                onClick={() => setActiveTab(tabId)} 
                className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer whitespace-nowrap ${
                  activeTab === tabId ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"
                }`}
              >
                {tabId === "all" ? "All Records" : tabId}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
            <select 
              value={entriesPerPage} 
              onChange={(e) => setEntriesPerPage(Number(e.target.value))} 
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all w-full md:w-auto"
            >
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
            </select>

            <div className="relative w-full md:w-auto">
              <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
              <input 
                type="text" 
                placeholder="Search appointments..." 
                className="w-full md:w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                <th onClick={() => handleSort('id')} className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center justify-between">Appointment ID <SortIcon column="id" /></div>
                </th>
                <th className="w-[20%] px-6 py-4 border-r border-gray-300">Client & Pet</th>
                <th className="w-[23%] px-6 py-4 border-r border-gray-300">Service Details</th>
                <th onClick={() => handleSort('total_service_fee')} className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center justify-center gap-2 text-center">Total Fee <SortIcon column="total_service_fee" /></div>
                </th> 
                <th onClick={() => handleSort('start')} className="w-[13%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors group">
                  <div className="flex items-center justify-center gap-2">Schedule <SortIcon column="start" /></div>
                </th>
                <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
                <th className="w-[10%] px-6 py-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="text-sm divide-y divide-gray-200">
              {paginated.length > 0 ? paginated.map(appt => {
                    const now = new Date();
                    
                    // Only flag as outdated if it missed its schedule AND hasn't been resolved
                    const isPast = new Date(appt.start) < now && ['pending', 'confirmed'].includes(appt.status);

                    // 1. Correctly map "item_name" based on your JSON structure
                    const displayList = (appt.order_items?.length > 0 
                      ? appt.order_items.map(item => item.item_name).filter(Boolean).join(', ')
                      : (appt.service_names || "General Service")).replace(/_/g, ' ');

                    // 2. Calculate actual Total (Service Fee + Product Total)
                    const grandTotal = appt.order_items?.length > 0
                  ? appt.order_items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
                  : Number(appt.total_service_fee || 0) + Number(appt.product_total || 0);

                    return (
                      <tr key={appt.id} className="transition-colors hover:bg-gray-50/80 even:bg-gray-50/30">
                        {/* --- ID Column --- */}
                        <td className="px-6 py-4 font-bold text-gray-800 border-r border-gray-300">
                          #{appt.id}
                        </td>
                        
                        {/* --- Client & Pet Column --- */}
                        <td className="px-6 py-4 border-r border-gray-300">
                          <div className="flex items-center gap-3">
                            <img 
                              src={getMediaUrl(appt.pet_picture, appt.pet_name)} 
                              className="object-cover w-10 h-10 border border-gray-200 rounded-full bg-blue-50" 
                              alt="pet"
                            />
                            <div className="min-w-0">
                              <p className="font-bold leading-tight capitalize truncate max-w-[140px] text-gray-800">
                                {appt.pet_name || "Unknown Pet"}
                              </p>
                              <p className="text-[10px] text-gray-500 uppercase tracking-wide truncate max-w-[140px]">
                                Owner: {appt.owner_name || "Client"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* --- Service Details Column (UPDATED) --- */}
                        <td className="px-6 py-4 border-r border-gray-300">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p 
                                className={`font-bold leading-tight uppercase truncate max-w-[200px] ${isPast ? "text-amber-700" : "text-gray-800"}`}
                                title={displayList} 
                              >
                                {displayList}
                              </p>
                              {appt.order_items?.length > 1 && (
                                <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded whitespace-nowrap">
                                  {appt.order_items.length} ITEMS
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 bg-gray-100 text-[9px] font-bold text-gray-500 rounded uppercase border border-gray-200 inline-block">
                                Staff: {appt.staff_name || 'Unassigned'}
                              </span>
                              {isPast && (
                                <span className="text-[8px] font-black text-amber-600 uppercase italic">Outdated</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* --- Total Fee Column --- */}
                        <td className="px-6 py-4 text-center border-r border-gray-300">
                          <p className="text-sm font-black text-(--clr-primary) tracking-tight">
                            ₱{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          {(appt.order_items?.length > 1 || Number(appt.product_total) > 0) && (
                            <p className="text-[8px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter">Incl. Products</p>
                          )}
                        </td>

                        {/* --- Schedule Column --- */}
                        <td className="px-6 py-4 text-center border-r border-gray-300">
                          <p className="text-[11px] font-bold uppercase text-gray-600 leading-tight">
                            {appt.start ? new Date(appt.start).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                          </p>
                          <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                            {appt.start ? new Date(appt.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </td>

                        {/* --- Status Column --- */}
                        <td className="px-6 py-4 text-center border-r border-gray-300">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border inline-block min-w-[75px] ${
                            appt.status === 'completed' ? 'bg-green-50 text-(--clr-primary) border-green-200' : 
                            (appt.status === 'confirmed' || appt.status === 'billed')  ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                            (appt.status === 'cancelled' || appt.status === 'rejected') ? 'bg-red-50 text-red-500 border-red-200' : 
                            'bg-amber-50 text-amber-500 border-amber-300'
                          }`}>
                            {appt.status || 'pending'}
                          </span>
                        </td>

                        {/* --- Action Column --- */}
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleOpenModal(appt)} 
                            className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-95"
                          >
                            <HiOutlineEye size={16}/>
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                <tr>
                  <td colSpan="7" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                    <div className="flex flex-col items-center max-w-xs mx-auto">
                      <div className="p-4 rounded-full bg-gray-50">
                        <CiSearch className="text-gray-300" size={40} />
                      </div>
                      <h3 className="font-bold text-gray-800">No {activeTab === 'all' ? '' : activeTab} appointment found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {search
                          ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                          : `There are currently no appointments marked as ${activeTab}.`}
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
          <span className="text-[11px] text-gray-500 font-black uppercase italic">Total: {filteredAndSorted.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronLeft/></button>
            <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20"><HiChevronRight/></button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <AppointmentHistoryModal 
          appointment={selectedAppointment} 
          onClose={handleCloseModal} 
        />
      )}
    </>
  );
}