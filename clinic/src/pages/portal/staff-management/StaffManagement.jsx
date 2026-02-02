import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
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
  const [activeTab, setActiveTab] = useState('staffList'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [branchSchedule, setBranchSchedule] = useState([]);
  const [cardData, setCardData] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBranchSettings = useCallback(async () => {
    if (!branchId) return;
    try {
      // Use your existing endpoint for branch settings
      const response = await authFetch(
        `${API_URL}/api/clinic/general/branch-settings/branch-schedule/get-branch-schedule.php?branch_id=${branchId}`,
        { method: 'GET' }
      );
      if(response.success) {
        setBranchSchedule(response.data.schedules || []);
      }
    } catch(error) {
      console.error("error:", error);
    }
  }, [branchId]);

  const fetchStaffData = useCallback(async () => {
    if (!branchId) return; 
    
    showLoader('Fetching staff records...');
    
    try {
      const response = await authFetch(
        `${API_URL}/api/clinic/general/staff/get-staff-data.php?branch_id=${branchId}`,
        { method: 'GET' }
      );
      if(response.success) {
        setStaffData(response.data);
        setCardData(response.cardData);
      }
    } catch(error) {
      console.error("error:", error);
    } finally {
      hideLoader(); 
    }
  }, [branchId]);

  useEffect(() => {
    fetchStaffData();
    fetchBranchSettings();
  }, [fetchStaffData, fetchBranchSettings]);

  const handleToggleStatus = async (staff) => {
    const newStatus = Number(staff.status) === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'active' : 'archive';

    if (!window.confirm(`Are you sure you want to ${actionText} this staff member?`)) return;

    showLoader(`Please wait, ${actionText} staff...`);
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
        fetchStaffData(); 
      } else {
        console.error(response.message)
        toast.error(response.message || "Something went wrong");
      }
    } catch (error) {
      console.error("Toggle Error:", error);
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    }
  };

  const filteredStaff = staffData.filter(staff => {
    const fullName = `${staff.fname} ${staff.lname}`.toLowerCase();
    const role = (staff.role_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || role.includes(search);
  });

  return (
    <div className="bg-(--clr-bg-page) min-h-screen">
      <Header />
      
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-gray-500">Manage staff profiles, assigned roles, and duty schedules</p>
          </div>
        </div>

        <StaffCard data={cardData} />

        <div className="mt-8">
          {/* tabs */}
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
      </section>

      {isModalOpen && (
        <AddStaffModal 
          initialData={selectedStaff}
          branchSchedule={branchSchedule}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedStaff(null); 
          }} 
          onRefresh={fetchStaffData}
          branchId={branchId}
        />
      )}
    </div>
  );
}