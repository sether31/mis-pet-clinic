import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
// sections
import AddStaffModal from './AddStaffModal';
import StaffCard from './StaffCard';
import StaffTable from './StaffTable';

export default function StaffManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const [activeTab, setActiveTab] = useState('staffList'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [staffData, setStaffData] = useState([]);
  const [cardData, setCardData] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null);

  const fetchStaffData = useCallback(async () => {
    if (!branchId) return; 
    
    showLoader('Fetching staff records...');
    
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/clinic/general/staff/get-staff-data.php?branch_id=${branchId}`,
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
  }, [fetchStaffData]);

  const handleToggleStatus = async (staff) => {
    const newStatus = Number(staff.status) === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? 'active' : 'archive';

    if (!window.confirm(`Are you sure you want to ${actionText} this staff member?`)) return;

    showLoader(`Please wait, ${actionText} staff...`);
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_API_URL}/api/clinic/general/staff/update-staff-status.php`,
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

  return (
    <div className="bg-(--clr-bg-page) min-h-screen">
      <Header />
      
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
            <p className="text-gray-500">Manage staff, roles, and branch schedules</p>
          </div>
        </div>

        <StaffCard data={cardData} />

        <div className="mt-8">
          {/* tabs */}
          <div className="flex w-full max-w-md p-1 mx-auto mb-6 bg-gray-200 rounded-2xl lg:mx-0">
            <button 
              onClick={() => setActiveTab('staffList')} 
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'staffList' ? 'bg-white text-black' : 'text-gray-500'}`}
            >
              Staff list
            </button>
            <button 
              onClick={() => setActiveTab('schedule')} 
              className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all cursor-pointer ${activeTab === 'schedule' ? 'bg-white text-black' : 'text-gray-500'}`}
            >
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
            <div key="schedule" className="flex flex-col items-center justify-center py-20 bg-white border border-gray-100 rounded-3xl">
              <h1 className="text-xl font-bold">Schedule</h1>
            </div>
          )}
        </div>
      </section>

      {isModalOpen && (
        <AddStaffModal 
          initialData={selectedStaff}
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