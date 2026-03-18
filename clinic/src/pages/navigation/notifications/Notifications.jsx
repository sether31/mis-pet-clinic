import { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUser } from '../../../hooks/useUser';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import NotificationModal from './components/NotificationModal'; 
import NotificationTable from './components/NotificationTable'; 
// icons
import { HiSearch } from 'react-icons/hi';
import { HiChevronLeft, HiChevronRight, HiOutlineInformationCircle } from 'react-icons/hi2';
import { IoBagHandleOutline, IoCalendarOutline, IoCardOutline } from 'react-icons/io5';
import { LuPackage } from 'react-icons/lu';
import { TbAlertTriangle } from 'react-icons/tb';

const API_URL = import.meta.env.VITE_API_URL;

export default function Notifications() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Table Controls
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);

  // REAL DATA FETCH
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/notifications/get-notifications.php`);
      if (res.success) {
        setData(res.data);
        setUnreadCount(res.unread_count);
      } else {
        toast.error(res.message || "Failed to load notifications");
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("Network error while loading notifications.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleSort = (key) => {
    let direction = 'desc'; 
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleView = async (notif) => {
    setSelectedNotif(notif);
    setModalVisible(true);

    if(!notif.isRead) {
      // Calculate the new count locally
      const newCount = Math.max(0, unreadCount - 1);
      
      // Update the page state
      setData(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(newCount);

      window.dispatchEvent(new CustomEvent('syncUnreadCount', { detail: newCount }));

      try {
        await authFetch(`${API_URL}/api/clinic/general/notifications/update-notification-status.php`, {
          method: 'POST',
          body: JSON.stringify({ notification_id: notif.id })
        });
      } catch (error) {
        console.error("Failed to mark as read", error);
      }
    }
  };

  // Mark All Read
  const handleMarkAllRead = async () => {
    setData(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    window.dispatchEvent(new CustomEvent('syncUnreadCount', { detail: 0 }));

    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/notifications/update-notification-status.php`, {
        method: 'POST',
        body: JSON.stringify({ notification_id: 'all' })
      });
      if (res.success) toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  // Filtering and Sorting logic
  const filteredAndSorted = useMemo(() => {
    let result = data
      .filter(item => {
        if (activeTab === "unread") return item.isRead === false;
        if (activeTab === "read") return item.isRead === true;
        return true; 
      })
      .filter(item => 
        !search || 
        item.title?.toLowerCase().includes(search.toLowerCase()) || 
        item.message?.toLowerCase().includes(search.toLowerCase()) ||
        item.type?.toLowerCase().includes(search.toLowerCase())
      );

    if(sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if(sortConfig.key === 'date') {
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

  const getCategoryBadge = (category) => {
    switch(category?.toLowerCase()) {
      case 'appointment':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 rounded-lg w-fit mx-auto"><IoCalendarOutline size={12}/> Booking</span>;
      case 'reservation':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 border border-purple-200 rounded-lg w-fit mx-auto"><IoBagHandleOutline size={12}/>Reservation</span>;
      case 'inventory':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 rounded-lg w-fit mx-auto"><LuPackage size={12}/> Inventory</span>;
      case 'billing':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-(--clr-primary) bg-green-50 border border-green-200 rounded-lg w-fit mx-auto"><IoCardOutline size={12}/> Billing</span>;

      // subs
      case 'subscription':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-200 rounded-lg w-fit mx-auto"><IoCardOutline size={12}/> Subscription</span>;
      case 'subscription_warn':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-300 rounded-lg w-fit mx-auto"><TbAlertTriangle size={12}/> Expiring Soon</span>;
      case 'subscription_expired':
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-red-700 bg-red-50 border border-red-200 rounded-lg w-fit mx-auto"><TbAlertTriangle size={12}/> Expired</span>;

      default:
        return <span className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-700 bg-gray-100 border border-gray-300 rounded-lg w-fit mx-auto"><HiOutlineInformationCircle size={12}/> System</span>;
    }
  };

  const getSubtitle = (role) => {
    switch(role?.toLowerCase()) {
      case 'veterinarian':
      case 'groomer':
        return "Stay updated on your upcoming appointments and patient alerts.";
      case 'branch_admin':
      case 'clinic_admin':
        return "Monitor clinic operations, low stock warnings, and daily events.";
      case 'staff':
        return "Track incoming bookings, shop reservations, and daily tasks.";
      default:
        return "Review your latest system alerts, booking requests, and updates.";
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />

      <section className='px-6 my-8 container-xl'>
        
        {/* Page Titles */}
        <div className="flex flex-col mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Your Inbox</h1>
            {unreadCount > 0 && (
              <span className="bg-(--clr-primary) text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-gray-500">
            {getSubtitle(user?.role)}
          </p>
        </div>

        {/* Main Table Container */}
        <div className="flex flex-col w-full overflow-hidden text-left bg-white border border-gray-300 rounded-xl">
          
          {/* Controls Header */}
          <div className="flex flex-col justify-between gap-4 p-4 bg-white border-b border-gray-300 xl:flex-row xl:items-center">
            
            {/* Tabs */}
            <div className="flex justify-center w-full p-1 bg-gray-100 rounded-lg xl:w-fit">
              {[
                { id: "all", label: "All Alerts" },
                { id: "unread", label: "Unread" },
                { id: "read", label: "Read" }
              ].map(tab => (
                <button 
                  key={tab.id} 
                  onClick={() => setActiveTab(tab.id)} 
                  className={`px-4 py-2 text-[10px] font-bold rounded-md transition-all uppercase tracking-wide cursor-pointer ${activeTab === tab.id ? "bg-(--clr-primary) text-white" : "text-gray-500 hover:text-gray-900"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters */}
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
                  placeholder="Search alerts..." 
                  className="w-full md:w-64 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg outline-none bg-gray-50 focus:ring-1 focus:ring-(--clr-primary)" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>

              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead} 
                  className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-black rounded-lg uppercase tracking-widest transition-all cursor-pointer border border-gray-300"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>

          {/* Render the Extracted Table Component */}
          <NotificationTable 
            isLoading={isLoading}
            paginated={paginated}
            handleSort={handleSort}
            sortConfig={sortConfig}
            getCategoryBadge={getCategoryBadge}
            handleView={handleView}
            activeTab={activeTab}
            search={search}
            setSearch={setSearch}
          />

          {/* Pagination */}
          {!isLoading && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-300 flex justify-between items-center h-[64px]">
              <span className="text-[11px] text-gray-500 font-black uppercase tracking-widest">Total: {filteredAndSorted.length}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 transition-colors bg-white border rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-100"><HiChevronLeft/></button>
                <span className="px-4 text-xs font-black">{currentPage} / {totalPages || 1}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage >= totalPages} className="p-2 transition-colors bg-white border rounded-lg cursor-pointer disabled:opacity-20 hover:bg-gray-100"><HiChevronRight/></button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Render the Extracted Modal Component */}
      <NotificationModal 
        isOpen={modalVisible} 
        onClose={() => setModalVisible(false)} 
        notification={selectedNotif} 
        getCategoryBadge={getCategoryBadge} 
      />

    </div>
  );
}