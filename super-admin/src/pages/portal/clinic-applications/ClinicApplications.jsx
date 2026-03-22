import { useState, useEffect } from 'react'
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
// component
import Header from '../../../components/Header'
import DashboardCard from '../../../components/DashboardCard'
import LoaderV2 from '../../../components/LoaderV2';
// sub component
import ClinicApplicationTable from './components/ClinicApplicationTable'
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
        const formattedData = response.data
          .map(item => ({
            ...item,
            feedback: item.feedback || "",
            status: item.status || "pending"
          }))
          // Filter out approved and suspended here
          .filter(item => item.status !== 'approved' && item.status !== 'suspended');
          
        setClinics(formattedData);
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

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clinic Application Review</h1>
            <p className="text-gray-500">Review and manage registration requests from new clinic partners.</p>
          </div>
        </div>

        
        {loading ? (
          <LoaderV2 />
        ) : (
            <>
              <div className='grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3'>
                <DashboardCard title='Total Applications' data={clinics.length} icon={HiOutlineBuildingOffice2} />
                <DashboardCard title='Pending Review' data={clinics.filter(c => c.status === 'pending').length} icon={IoDocumentTextOutline} iconColor='text-amber-500' />
                <DashboardCard title='Rejected' data={clinics.filter(c => c.status === 'rejected').length} icon={IoDocumentTextOutline} iconColor='text-red-500' />
              </div>

              <div className='pb-20'>
                <ClinicApplicationTable 
                  data={clinics} 
                  onAccept={handleAccept} 
                  onReject={handleReject} 
                />
              </div>
            </>
          )}
      </section>
    </div>
  )
}