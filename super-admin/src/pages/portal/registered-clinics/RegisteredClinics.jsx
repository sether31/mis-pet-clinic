import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
// component
import Header from '../../../components/Header'
import DashboardCard from '../../../components/DashboardCard'
import LoaderV2 from '../../../components/LoaderV2';
// sub component
import RegisteredClinicsTable from './components/RegisteredClinicsTable'
// icons
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2'
import { IoCheckmarkCircleOutline, IoPauseCircleOutline } from 'react-icons/io5'
import { IoDocumentTextOutline } from 'react-icons/io5'

const API_URL = import.meta.env.VITE_API_URL;

export default function RegisteredClinics() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      // Using the new endpoint that only gets Approved/Suspended
      const response = await authFetch(`${API_URL}/api/super-admin/registered-clinics/get-registered-clinics.php`);
      
      if(response.success && Array.isArray(response.data)) {
        setClinics(response.data);
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

  // Frontend calculation for card stats
  const stats = useMemo(() => ({
    total: clinics.length,
    active: clinics.filter(c => c.status === 'approved').length,
    suspended: clinics.filter(c => c.status === 'suspended').length
  }), [clinics]);


  const handleAction = async (id, status, feedback) => {
    try {
      const response = await authFetch(`${API_URL}/api/super-admin/registered-clinics/update-registered-clinics-status.php`, {
        method: 'POST',
        body: JSON.stringify({ 
          branch_id: id, 
          status: status,
          feedback: feedback 
        })
      });
      
      if(response.success) {
        setClinics(prev => prev.map(item => 
          item.branch_id === id ? { ...item, status, feedback } : item
        ));
        return response; 
      } else {
        throw new Error("Something went wrong");
      }
    } catch (error) {
      console.log(error);
    }
  };


  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registered Clinics</h1>
            <p className="text-gray-500">Manage and monitor your active and suspended clinic partners.</p>
          </div>
        </div>

        {loading ? (
          <LoaderV2 />
        ) : (
            <>
              {/* Updated Stats Cards */}
              <div className='grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3'>
                <DashboardCard 
                  title='Total Clinics' 
                  data={stats.total} 
                  icon={HiOutlineBuildingOffice2} 
                />
                <DashboardCard 
                  title='Active Clinics' 
                  data={stats.active} 
                  icon={IoDocumentTextOutline} 
                  iconColor='text-(--clr-primary)' 
                />
                <DashboardCard 
                  title='Suspended Clinics' 
                  data={stats.suspended} 
                  icon={IoDocumentTextOutline} 
                  iconColor='text-red-600' 
                />
              </div>

              <div className='pb-20'>
                <RegisteredClinicsTable 
                  data={clinics} 
                  onAction={handleAction}
                />
              </div>
            </>
          )}
      </section>
    </div>
  )
}