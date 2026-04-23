import { useState, useMemo, useEffect } from 'react';
// images
import NoImage from '../../../../assets/images/no-image.jpg';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiOutlineEye } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown, HiSearch } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function ShopTable({ data = [], onReview }) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: 'order_id', direction: 'desc' });

  const getMediaUrl = (path) => {
    if (!path) return NoImage;
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

  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(order => activeTab === "all" ? true : order.order_status === activeTab)
      .filter(order => {
        if (customerTypeFilter === 'guest') return !order.owner_name;
        if (customerTypeFilter === 'user') return !!order.owner_name;
        return true;
      })
      .filter(order => {
        const customerName = order.owner_name || "Guest Walk-in";
        const searchLower = search.toLowerCase();
        return !search ||
          customerName.toLowerCase().includes(searchLower) ||
          order.product_name?.toLowerCase().includes(searchLower) ||
          order.order_id?.toString().includes(searchLower);
      });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'total_amount' || sortConfig.key === 'order_id') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        if (sortConfig.key === 'pickup_date') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, activeTab, search, sortConfig, customerTypeFilter]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, entriesPerPage, sortConfig, customerTypeFilter]);

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        <div className="flex justify-center w-full p-1 overflow-x-auto bg-gray-100 rounded-lg xl:w-fit scrollbar-hide">
          {[{ id: "all", label: "All Orders" }, { id: "pending", label: "Pending" }, { id: "confirmed", label: "Confirmed" }, { id: "completed", label: "Completed" }, { id: "rejected", label: "Rejected" }, { id: "cancelled", label: "Cancelled" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer whitespace-nowrap ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-(--clr-text-primary)"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <div className="flex items-center gap-2">
            <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all">
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
            </select>
            <select value={customerTypeFilter} onChange={(e) => setCustomerTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all">
              <option value="all">All Customers</option>
              <option value="user">User Only</option>
              <option value="guest">Guests Only</option>
            </select>
          </div>
          <div className="relative w-full md:w-auto">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search orders..." className="w-full md:w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('order_id')} className="w-[10%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Order ID <SortIcon column="order_id" /></div>
              </th>
              <th className="w-[18%] px-6 py-4 border-r border-gray-300">Customer</th>
              <th className="w-[28%] px-6 py-4 border-r border-gray-300">Product Details</th>
              <th onClick={() => handleSort('total_amount')} className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-center">
                <div className="flex items-center justify-center gap-2">Total <SortIcon column="total_amount" /></div>
              </th>
              <th onClick={() => handleSort('pickup_date')} className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors text-center">
                <div className="flex items-center justify-center gap-2">Date <SortIcon column="pickup_date" /></div>
              </th>
              <th className="w-[10%] px-6 py-4 border-r border-gray-300 text-center">Status</th>
              <th className="w-[10%] px-6 py-4 text-center">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(order => {
              const isMultipleItems = order.items && order.items.length > 1;
              return (
                <tr key={order.order_id} className="transition-colors hover:bg-gray-50/80 even:bg-gray-50/30">
                  <td className="px-6 py-4 font-bold text-gray-800 border-r border-gray-300">
                    #{order.order_id}
                  </td>

                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="flex items-center gap-3">
                      <img
                        src={order.profile_picture
                          ? getMediaUrl(order.profile_picture)
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(order.owner_name || "G")}&background=d1fae5&color=42756C&bold=true`
                        }
                        className="object-cover w-9 h-9 border border-gray-200 rounded-full bg-blue-50"
                        onError={(e) => { e.target.onerror = null; e.target.src = NoImage; }}
                        alt=""
                      />
                      <p className={`font-bold leading-tight capitalize truncate max-w-[140px] ${order.owner_name ? 'text-gray-800' : 'text-gray-500 italic'}`}>
                        {order.owner_name || "Guest Walk-in"}
                      </p>
                    </div>
                  </td>

                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="flex items-center gap-3">
                      <img
                        src={getMediaUrl(order.prod_pic)}
                        className="object-cover w-10 h-10 border border-gray-200 rounded-lg bg-gray-50"
                        onError={(e) => e.target.src = NoImage}
                        alt=""
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold leading-tight text-gray-800 uppercase truncate text-[11px]">
                          {isMultipleItems ? `${order.items[0].product_name} & ${order.items.length - 1} more...` : order.product_name}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-[8px] font-black text-gray-500 rounded uppercase border border-gray-200">
                            {order.quantity} Total Items
                          </span>
                          {!isMultipleItems && (
                            <span className="px-1.5 py-0.5 bg-blue-50 text-[8px] font-bold text-blue-600 rounded uppercase border border-blue-100">
                              ₱{parseFloat(order.unit_price).toLocaleString()} /ea
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <p className="text-sm font-black text-(--clr-primary) tracking-tight">
                      ₱{parseFloat(order.total_amount).toLocaleString()}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <p className="text-[11px] font-bold uppercase text-gray-600">
                      {order.pickup_date ? new Date(order.pickup_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Direct Sale'}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${order.order_status === 'completed' ? 'bg-green-50 text-(--clr-primary) border-green-200' :
                      order.order_status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        (order.order_status === 'cancelled' || order.order_status === 'rejected') ? 'bg-red-100 text-red-500 border-red-300' :
                          'bg-amber-50 text-amber-500 border-amber-300'
                      }`}>
                      {order.order_status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <button onClick={() => onReview(order)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all active:scale-95">
                      <HiOutlineEye size={16} />
                    </button>
                  </td>
                </tr>
              )
            }) : (
              <tr>
                <td colSpan="7" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="mt-2 font-bold text-gray-800">No {activeTab === "all" ? "" : activeTab} orders found</h3>
                    <p className="mt-1 text-sm text-gray-500 text-center">
                      {search ? `We couldn't find any results for "${search}".` : `There are currently no orders ${activeTab === "all" ? "available" : `marked as ${activeTab}`}.`}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length} entries</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-50 transition-all"><HiChevronLeft /></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-50 transition-all"><HiChevronRight /></button>
        </div>
      </div>
    </div>
  );
}