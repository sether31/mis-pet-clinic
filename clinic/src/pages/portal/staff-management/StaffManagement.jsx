import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2'; 
// sub components
import AddStaffModal from './AddStaffModal';
import StaffCard from './StaffCard';
import StaffTable from './StaffTable';
import StaffSchedule from './StaffSchedule';
// icons
import { HiCalendar, HiUserGroup } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function StaffManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('staffList'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [branchSchedule, setBranchSchedule] = useState([]);
  const [cardData, setCardData] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllData = useCallback(async () => {
    if (!branchId) return; 
    
    setIsLoading(true); 
    
    try {
      const [staffRes, scheduleRes] = await Promise.all([
        authFetch(`${API_URL}/api/clinic/general/staff/get-staff-data.php?branch_id=${branchId}`),
        authFetch(`${API_URL}/api/clinic/general/branch-settings/branch-schedule/get-branch-schedule.php?branch_id=${branchId}`)
      ]);

      if(staffRes.success) {
        setStaffData(staffRes.data);
        setCardData(staffRes.cardData);
      }
      
      if(scheduleRes.success) {
        setBranchSchedule(scheduleRes.data.schedules || []);
      }
    } catch(error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load staff data.");
    } finally {
      setIsLoading(false); 
    }
  }, [branchId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleToggleStatus = async (staff) => {
    const isArchiving = Number(staff.status) === 1;
    const newStatus = isArchiving ? 0 : 1;

    const result = await Swal.fire({
      title: isArchiving ? 'Archive Staff?' : 'Activate Staff?',
      text: `Are you sure you want to ${isArchiving ? 'archive' : 'activate'} "${staff.fname} ${staff.lname}?"`,
      icon: isArchiving ? 'warning' : 'info',
      buttonsStyling: false,
      showCancelButton: true,
      confirmButtonText: isArchiving ? 'Yes, Archive' : 'Yes, Activate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: '!rounded-xl border !border-gray-300 !max-w-lg',
        title: `!text-xl !font-black !uppercase !tracking-tight ${isArchiving ? '!text-red-600' : '!text-(--clr-primary)'}`,
        confirmButton: `rounded-lg px-5 py-2.5 cursor-pointer duration-300 ease-in-out active:scale-95 text-white text-sm font-bold ${isArchiving ? 'bg-red-500 hover:bg-red-600' : 'bg-(--clr-primary)/95 hover:bg-(--clr-primary)'}`,
        cancelButton: 'rounded-lg px-5 py-2.5 active:scale-95 duration-300 ease-in-out cursor-pointer text-sm font-bold'
      }
    });

    if(result.isConfirmed) {
      showLoader("Updating status...");
      try {
        const response = await authFetch(
          `${API_URL}/api/clinic/general/staff/update-staff-status.php`,
          {
            method: 'POST',
            body: JSON.stringify({
              user_id: staff.user_id,
              branch_id: branchId,
              status: newStatus
            })
          }
        );

        if(response.success) {
          toast.success(response.message);
          fetchAllData(); 
        } else {
          toast.error(response.message || "Something went wrong");
        }
      } catch (error) {
        toast.error("Something went wrong");
      } finally {
        hideLoader();
      }
    }
  };

  const filteredStaff = staffData.filter(staff => {
    const fullName = `${staff.fname} ${staff.lname}`.toLowerCase();
    const role = (staff.role_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || role.includes(search);
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-gray-500">Manage staff profiles, assigned roles, and duty schedules</p>
          </div>
        </div>

        {isLoading ? (
          <LoaderV2 />
        ) : (
          <>
            <StaffCard data={cardData} />

            <div className="mt-8">
             <div className="flex items-center w-full mb-6 border-b border-gray-200">
                <button 
                  onClick={() => setActiveTab('staffList')} 
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all cursor-pointer border-b-2 -mb-[2px] ${
                    activeTab === 'staffList' 
                    ? 'border-(--clr-primary) text-(--clr-primary)' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <HiUserGroup size={20} />
                  Staff List
                </button>
                <button 
                  onClick={() => setActiveTab('schedule')} 
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all cursor-pointer border-b-2 -mb-[2px] ${
                    activeTab === 'schedule' 
                    ? 'border-(--clr-primary) text-(--clr-primary)' 
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <HiCalendar size={20} />
                  Schedule
                </button>
              </div>

              {activeTab === 'staffList' ? (
                <div key="staffList">
                  <StaffTable 
                    data={staffData} 
                    onCreate={() => {
                      setSelectedStaff(null);
                      setIsModalOpen(true);
                    }}
                    onEdit={(staff) => {
                      setSelectedStaff(staff);
                      setIsModalOpen(true);
                    }}
                    onToggleStatus={handleToggleStatus}
                  />
                </div>
              ) : (
                <StaffSchedule
                  staffData={filteredStaff} 
                  branchSchedule={branchSchedule}
                  searchTerm={searchTerm}
                  onSearch={setSearchTerm} 
                />
              )}
            </div>
          </>
        )}
      </section>

      {isModalOpen && (
        <AddStaffModal 
          initialData={selectedStaff}
          branchSchedule={branchSchedule}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStaff(null); 
          }} 
          onRefresh={fetchAllData}
          branchId={branchId}
        />
      )}
    </div>
  );
}