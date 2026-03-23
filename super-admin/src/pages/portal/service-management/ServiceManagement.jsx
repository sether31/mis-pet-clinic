import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2';
// sub components
import ServiceCard from './components/ServiceCard';
import ServiceTable from './components/ServiceTable';
import AddServiceModal from './components/AddServiceModal';

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMasterServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/super-admin/services/get-main-services.php`);
      if(res.success) {
        setServices(res.data);
        setCardData(res.cardData);
      }
    } catch(error) { 
      toast.error("Failed to load services"); 
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMasterServices(); }, [fetchMasterServices]);

  const handleToggleStatus = async (service) => {
    const nextStatus = Number(service.status) === 1 ? 0 : 1;
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/super-admin/services/update-main-service-status.php`, {
        method: 'POST',
        body: JSON.stringify({ service_id: service.service_id, status: nextStatus })
      });
      if(res.success) { 
        toast.success(res.message); 
        fetchMasterServices(); 
      }
    } catch(error) {
      toast.error("Something went wrong");
    } 
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Management Overview</h1>
            <p className="text-gray-500">Configure and manage platform services</p>
          </div>
        </div>
        
        {loading ? (
          <LoaderV2 />
        ) : (
          <>
            <ServiceCard data={cardData} /> 
            
            <div className="mt-8">
              <ServiceTable 
                data={services} 
                onToggleStatus={handleToggleStatus} 
                onEdit={(s) => { setSelectedService(s); setIsModalOpen(true); }}
                onCreate={() => { setSelectedService(null); setIsModalOpen(true); }}
              />
            </div>
          </>
        )}
      </section>

      {isModalOpen && (
        <AddServiceModal 
          initialData={selectedService} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchMasterServices} 
        />
      )}
    </div>
  );
}