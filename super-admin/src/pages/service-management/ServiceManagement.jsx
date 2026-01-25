import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI';
// utils
import { authFetch } from '../../utils/authFetch';
// components
import Header from '../../components/Header';
// sub components
import ServiceCard from './ServiceCard';
import ServiceTable from './ServiceTable';
import AddServiceModal from './AddServiceModal';

export default function ServiceManagement() {
  const { showLoader, hideLoader } = useUI();
  const [services, setServices] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchMasterServices = useCallback(async () => {
    showLoader('Fetching services...');
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/api/super-admin/services/get-main-services.php`);
      if(res.success) {
        setServices(res.data);
        setCardData(res.cardData);
      }
    } catch(error) { 
      toast.error("Failed to load services"); 
    } finally { 
      hideLoader(); 
    }
  }, []);

  useEffect(() => { fetchMasterServices(); }, [fetchMasterServices]);

  const handleToggleStatus = async (service) => {
    const nextStatus = Number(service.status) === 1 ? 0 : 1;
    showLoader('Updating master status...');
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
      toast.error("Status update failed");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="bg-(--clr-bg-page) min-h-screen">
      <Header />
      <section className='px-6 my-6 container-xl'>
        <ServiceCard data={cardData} /> 
        
        <div className="mt-8">
          <ServiceTable 
            data={services} 
            onToggleStatus={handleToggleStatus} 
            onEdit={(s) => { setSelectedService(s); setIsModalOpen(true); }}
            onCreate={() => { setSelectedService(null); setIsModalOpen(true); }}
          />
        </div>
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