import { useState, useMemo, useEffect } from 'react';
// images
import NoImage from '../../../../assets/images/no-image.jpg';
// icons
import { CiSearch } from 'react-icons/ci';
import { HiSearch, HiPencilAlt, HiPlus, HiArchive, HiExclamationCircle, HiRefresh } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiChevronUp, HiChevronDown } from 'react-icons/hi2';
import SubscriptionGate from '../../../../components/SubscriptionGate';

const API_URL = import.meta.env.VITE_API_URL;

export default function InventoryTable({ data = [], onEdit, onToggleStatus, onCreate }) {
  const [activeTab, setActiveTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  // categories for the dropdown
  const categories = useMemo(() => {
    const unique = [...new Set(data.map(item => item.category))].filter(Boolean);
    return unique.sort();
  }, [data]);

  const formatDate = (dateString, category) => {
    if (!dateString) {
      return category === 'Accessories' ? "—" : "Not Set";
    }
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const getExpiryStatus = (dateString, category) => {
    if (!dateString || category === 'Accessories') {
      return { label: null, color: 'text-gray-400' }; 
    }
    
    const today = new Date();
    const expiry = new Date(dateString);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: 'Expired', color: 'text-red-600' };
    if (diffDays <= 30) return { label: 'Expiring Soon', color: 'text-amber-500' };
    return { label: null, color: 'text-gray-600' };
  };

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(item => {
        const isArchived = Number(item.is_active) === 0;
        
        if (activeTab === "archived") return isArchived;
        if (isArchived) return false;

        const stock = Number(item.stock_level);
        const minStock = Number(item.min_stock_level);
        
        if (activeTab === "low") return stock <= minStock && stock > 0;
        if (activeTab === "out") return stock === 0;
        if (activeTab === "expiring") {
          if (!item.expiry_date) return false;
          const today = new Date();
          const expiry = new Date(item.expiry_date);
          const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          return diffDays <= 30; 
        }
        return true;
      })
      .filter(item => {
        if (selectedCategory === "all") return true;
        return item.category === selectedCategory;
      })
      .filter(item => {
        const searchTerm = search.toLowerCase();
        return !search || 
        item.name?.toLowerCase().includes(searchTerm) || 
        item.brand_name?.toLowerCase().includes(searchTerm) || 
        item.dosage?.toLowerCase().includes(searchTerm) || 
        item.category?.toLowerCase().includes(searchTerm) ||
        item.supplier_name?.toLowerCase().includes(searchTerm)
      });

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if(['stock_level', 'unit_cost', 'price', 'is_active'].includes(sortConfig.key)) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }
        
        if(sortConfig.key === 'expiry_date') {
          aValue = aValue ? new Date(aValue).getTime() : 0;
          bValue = bValue ? new Date(bValue).getTime() : 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, activeTab, selectedCategory, search, sortConfig]);

  const paginated = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCategory, search, entriesPerPage, sortConfig]);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <HiChevronDown className="opacity-20" />;
    return sortConfig.direction === 'desc' ? <HiChevronUp className="text-(--clr-primary)" /> : <HiChevronDown className="text-(--clr-primary)" />;
  };

  return (
    <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl shadow-sm">
      <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row">
        
        {/* tabs */}
        <div className="flex justify-center w-full p-1 bg-gray-100 rounded-lg xl:w-fit">
          {[
            { id: "all", label: "All Items" },
            { id: "low", label: "Low Stock" },
            { id: "out", label: "Out of Stock" },
            { id: "expiring", label: "Expiring Soon" },
            { id: "archived", label: "Archived" }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white shadow-sm" : "text-gray-500 hover:text-(--clr-text-primary)"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* filters */}
        <div className="flex flex-col items-center justify-center gap-3 md:flex-row">
          <div className="flex gap-3">
            <select value={entriesPerPage} onChange={(e) => setEntriesPerPage(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all">
              {[5, 10, 20, 50].map(v => <option key={v} value={v}>Show {v}</option>)}
            </select>

            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-gray-50 outline-none cursor-pointer hover:border-black transition-all min-w-[140px]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <HiSearch className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input type="text" placeholder="Search name, brand, dosage..." className="w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <SubscriptionGate type="inventory">
            <button onClick={onCreate} className="px-6 py-2 bg-(--clr-primary) text-white text-[11px] font-black rounded-lg uppercase tracking-widest flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer">
              <HiPlus size={14}/> Add Product
            </button>
          </SubscriptionGate>
        </div>
      </div>

      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              <th onClick={() => handleSort('name')} className="w-[22%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">Product Details <SortIcon column="name" /></div>
              </th>
              <th onClick={() => handleSort('is_active')} className="w-[10%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Status <SortIcon column="is_active" /></div>
              </th>
              <th onClick={() => handleSort('stock_level')} className="w-[11%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100 text-center">
                <div className="flex items-center justify-center gap-2">Stock Level <SortIcon column="stock_level" /></div>
              </th>
              <th onClick={() => handleSort('unit_cost')} className="w-[11%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Unit Cost <SortIcon column="unit_cost" /></div>
              </th>
              <th onClick={() => handleSort('price')} className="w-[12%] px-6 py-4 border-r border-gray-300 cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-between">Retail Price <SortIcon column="price" /></div>
              </th>
              <th onClick={() => handleSort('expiry_date')} className="w-[15%] px-6 py-4 border-r border-gray-300 text-center cursor-pointer hover:bg-gray-100">
                <div className="flex items-center justify-center gap-2">Expiry Date <SortIcon column="expiry_date" /></div>
              </th>
              <th className="w-[12%] px-6 py-4 border-r border-gray-300 font-bold uppercase tracking-widest text-gray-600">Supplier</th>
              <th className="w-[9%] px-6 py-4 text-center font-bold uppercase tracking-widest text-gray-600">Action</th>
            </tr>
          </thead>

          <tbody className="text-sm divide-y divide-gray-200">
            {paginated.length > 0 ? paginated.map(item => {
              const isLow = Number(item.stock_level) <= Number(item.min_stock_level);
              const expiryStatus = getExpiryStatus(item.expiry_date, item.category);
              const isArchived = Number(item.is_active) === 0;
              
              return (
                <tr key={item.inventory_id} className="transition-colors hover:bg-gray-50/80 even:bg-gray-50/30">
                  {/* Product Details Cell */}
                  <td className="px-6 py-4 border-r border-gray-300">
                    <div className="flex items-center gap-3">
                      <img 
                        src={item.prod_pic ? `${API_URL}/${item.prod_pic}` : NoImage} 
                        className="object-cover w-12 h-12 border border-gray-200 rounded-lg shadow-sm" 
                        onError={(e) => e.target.src = NoImage} 
                      />
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold leading-tight text-gray-800 capitalize text-xs">
                            {item.name || "Unnamed"}
                          </p>
                          
                          {/* DOSAGE: Only show for Medication or Supplies */}
                          {(item.category === 'Medication' || item.category === 'Supplies') && item.dosage && (
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-50 text-(--clr-primary)">
                              {item.dosage}
                            </span>
                          )}
                        </div>
                        
                        {/* BRAND INFO: Conditional Display */}
                        <div className="text-[10px] font-bold text-gray-500 uppercase italic">
                          {item.brand_name ? (
                            <span>
                              {item.brand_name}
                              {/* BRAND TYPE: Only show (Generic/Branded) if it's Medicine/Supplies and not 'N/A' */}
                              {(item.category === 'Medication' || item.category === 'Supplies') && item.brand_type !== 'N/A' && (
                                <> • {item.brand_type}</>
                              )}
                            </span>
                          ) : (
                            <span>No Brand</span>
                          )}
                        </div>
                        
                        <span className="w-fit px-2 py-0.5 bg-gray-100 text-[8px] font-black text-gray-400 rounded uppercase border border-gray-200 mt-1">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status Cell */}
                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${isArchived ? 'bg-red-100 text-red-500 border-red-300' : 'bg-green-50 text-(--clr-primary) border-green-200'}`}>
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
                  </td>

                  {/* Stock Level Cell */}
                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <span className={`text-sm font-black ${
                      Number(item.stock_level) === 0 
                        ? 'text-red-600' 
                        : isLow 
                          ? 'text-amber-500' 
                          : 'text-gray-800'
                    }`}>
                      {item.stock_level}
                    </span>

                    {isLow && !isArchived && (
                      <p className={`text-[8px] font-bold uppercase flex items-center justify-center gap-1 mt-0.5 ${
                        Number(item.stock_level) === 0 ? 'text-red-500' : 'text-amber-500'
                      }`}>
                        <HiExclamationCircle size={10}/> 
                        {Number(item.stock_level) === 0 ? 'Out' : 'Low'}
                      </p>
                    )}
                  </td>

                  {/* Financials */}
                  <td className="px-6 py-4 font-bold text-gray-600 border-r border-gray-300">₱{Number(item.unit_cost).toLocaleString()}</td>
                  <td className="px-6 py-4 border-r border-gray-300 font-bold text-(--clr-primary)">₱{Number(item.price).toLocaleString()}</td>

                  {/* Expiry Date Cell */}
                  <td className="px-6 py-4 text-center border-r border-gray-300">
                    <p className={`text-[11px] font-bold uppercase ${expiryStatus.color}`}>
                      {formatDate(item.expiry_date, item.category)}
                    </p>
                    {expiryStatus.label && !isArchived && (
                      <p className={`text-[8px] font-bold uppercase flex items-center justify-center gap-1 mt-0.5 ${expiryStatus.color}`}>
                        <HiExclamationCircle size={10}/> {expiryStatus.label}
                      </p>
                    )}
                  </td>

                  {/* Supplier Cell */}
                  <td className="px-6 py-4 border-r border-gray-300">
                    <p className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{item.supplier_name || 'N/A'}</p>
                    <p className="text-[9px] text-gray-400 italic">{item.supplier_contact || ''}</p>
                  </td>

                  {/* Actions Cell */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      <SubscriptionGate type="inventory" iconOnly={true}>
                        <button onClick={() => onEdit(item)} className="p-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-(--clr-primary) hover:text-(--clr-primary) transition-all">
                          <HiPencilAlt size={16}/>
                        </button>
                      </SubscriptionGate>
                      <SubscriptionGate type="inventory" iconOnly={true}>
                        <button 
                          onClick={() => onToggleStatus(item)} 
                          className={`p-2 bg-white border border-gray-300 rounded-lg cursor-pointer transition-all ${isArchived ? 'hover:border-(--clr-primary) hover:text-(--clr-primary)' : 'hover:border-red-600 hover:text-red-600'}`}
                          title={isArchived ? 'Restore Item' : 'Archive Item'}
                        >
                          {isArchived ? <HiRefresh size={16}/> : <HiArchive size={16}/>}
                        </button>
                      </SubscriptionGate>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="8" className="py-24 text-center bg-white border-gray-200 border-dashed rounded-b-3xl">
                  <div className="flex flex-col items-center max-w-xs mx-auto">
                    <div className="p-4 rounded-full bg-gray-50">
                      <CiSearch className="text-gray-300" size={40} />
                    </div>
                    <h3 className="font-bold text-gray-800">
                      No {activeTab === 'all' ? 'products' : `${activeTab.replace('_', ' ')} items`} found
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search
                        ? `We couldn't find any results for "${search}" in the ${activeTab} list.`
                        : activeTab === 'all' 
                          ? "Your inventory is currently empty."
                          : `There are currently no products marked as ${activeTab.replace('_', ' ')}.`}
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

      {/* pagination */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
        <span className="text-[11px] text-gray-500 font-black uppercase">Total: {filteredAndSorted.length}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20 transition-opacity"><HiChevronLeft/></button>
          <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 bg-white border rounded-lg cursor-pointer disabled:opacity-20 transition-opacity"><HiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}