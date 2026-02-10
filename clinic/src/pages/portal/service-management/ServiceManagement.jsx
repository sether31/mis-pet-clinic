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
import ServiceCard from './ServiceCard';
import ServiceTable from './ServiceTable';
import AddServiceModal from './AddServiceModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function ServiceManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const [services, setServices] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServiceData = useCallback(async () => {
    if (!branchId || branchId === 'undefined') return;
    
    showLoader('Fetching services...');
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/services/get-branch-services.php?branch_id=${branchId}`);
      if(res.success) {
        setServices(res.data);
        setCardData(res.cardData);
      }
    } catch (error) { toast.error("Failed to load"); }
    finally { hideLoader(); }
  }, [branchId]);

  useEffect(() => { fetchServiceData(); }, [fetchServiceData]);

  const handleToggleStatus = async (service) => {
    const nextStatus = Number(service.status) === 1 ? 0 : 1;
    showLoader('Updating...');
    const res = await authFetch(`${API_URL}/api/clinic/general/services/update-service-status.php`, {
      method: 'POST',
      body: JSON.stringify({ branch_service_id: service.branch_service_id, status: nextStatus })
    });
    if (res.success) { toast.success(res.message); fetchServiceData(); }
    hideLoader();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header />
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
            <p className="text-gray-500">Manage clinic services and service pricing</p>
          </div>
        </div>
        
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

      {/* service modal */}
      {isModalOpen && branchId && (
        <AddServiceModal 
          initialData={selectedService} 
          branchId={branchId} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchServiceData} 
        />
      )}
    </div>
  );
}