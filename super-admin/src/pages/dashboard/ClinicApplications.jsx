import { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// component
import Header from '../../components/Header'
import DashboardCard from '../../components/DashboardCard'
import ClinicApplicationTable from '../../components/ClinicApplicationTable'
import FullScreenLoader from '../../components/FullScreenLoader'
// utils
import wait from '../../utils/wait'
// icons
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'
import { IoDocumentTextOutline } from 'react-icons/io5'


const API_URL = import.meta.env.VITE_API_URL;

export default function ClinicApplications() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      await wait(200);
      const response = await fetch(`${API_URL}/api/super-admin/clinic-application/clinic-application.php`);
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const formattedData = result.data.map(item => ({
          ...item,
          feedback: item.feedback || "",
          status: item.status || "pending"
        }));
        setClinics(formattedData);
        console.log(formattedData)
      } else {
        setClinics([]); 
      }
    } catch (error) {
      console.error("Network Error:", error);
      toast.error("Something went wrong");
      setClinics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  // Removed alerts here because the Table Component handles the notifications
  const handleUpdateStatus = async (id, status, feedback) => {
    const response = await fetch(`${API_URL}/api/super-admin/clinic-application/update-clinic-application-status.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        branch_id: id, 
        status: status, 
        feedback: feedback 
      })
    });
    
    const res = await response.json();
    
    if (res.success) {
      // Update local state so the UI reflects the change immediately
      setClinics(prev => prev.map(item => 
        item.branch_id === id ? { ...item, status, feedback: feedback } : item
      ));
      return res; // Return success to the Table component
    } else {
      // If the API fails, we throw an error so the Table's catch block triggers the error toast
      throw new Error(res.message || "Failed to update status");
    }
  };

  // actions
  const handleAccept = (id, feedback) => handleUpdateStatus(id, 'approved', feedback);
  const handleReject = (id, feedback) => handleUpdateStatus(id, 'rejected', feedback);

  return (
    <div className='bg-[var(--clr-bg-page)] min-h-screen container-xl'>
      <Header />
      <section className='my-6 container-xl'>
        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8'>
          <DashboardCard title='Total Applications' data={clinics.length} icon={HiOutlineBuildingOffice2} />
          <DashboardCard title='Pending Review' data={clinics.filter(c => c.status === 'pending').length} icon={IoDocumentTextOutline} iconColor='text-amber-500' />
          <DashboardCard title='Approved' data={clinics.filter(c => c.status === 'approved').length} icon={IoDocumentTextOutline} iconColor='text-green-700' />
          <DashboardCard title='Rejected' data={clinics.filter(c => c.status === 'rejected').length} icon={IoDocumentTextOutline} iconColor='text-red-500' />
        </div>

        <div className='pb-20'>
            <ClinicApplicationTable 
              data={clinics} 
              onAccept={handleAccept} 
              onReject={handleReject} 
            />
        </div>
      </section>

      {/* Keep ToastContainer here so it's globally available for this page */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      {/* loader */}
      {loading && (
        <FullScreenLoader message='Fetching...' />
      )}
    </div>
  )
}