import { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// component
import Header from '../../components/Header'
import DashboardCard from '../../components/DashboardCard'
import ClinicApplicationTable from '../../components/ClinicApplicationTable'
import FullScreenLoader from '../../components/FullScreenLoader'
// utils
import { authFetch } from '../../utils/authFetch';
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
      const response = await authFetch(`${API_URL}/api/super-admin/clinic-application/clinic-application.php`);
      
      if(response.success && Array.isArray(response.data)) {
        const formattedData = response.data.map(item => ({
          ...item,
          feedback: item.feedback || "",
          status: item.status || "pending"
        }));
        setClinics(formattedData);
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

  
  const handleUpdateStatus = async (id, status, feedback) => {
    const response = await authFetch(`${API_URL}/api/super-admin/clinic-application/update-clinic-application-status.php`, {
      method: 'POST',
      body: JSON.stringify({ 
        branch_id: id, 
        status: status, 
        feedback: feedback 
      })
    });
    
    
    if(response.success) {
      // update local change for dynamic ui
      setClinics(prev => prev.map(item => 
        item.branch_id === id ? { ...item, status, feedback: feedback } : item
      ));
      return response; 
    } else {
      throw new Error(response.message || "Failed to update status");
    }
  };

  // actions
  const handleAccept = (id, feedback) => handleUpdateStatus(id, 'approved', feedback);
  const handleReject = (id, feedback) => handleUpdateStatus(id, 'rejected', feedback);

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />
      <section className='my-6 container-xl'>
        <div className='grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4'>
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