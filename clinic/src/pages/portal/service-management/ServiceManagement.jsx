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
import ServiceCard from './ServiceCard';
import ServiceTable from './ServiceTable';
import AddServiceModal from './AddServiceModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function ServiceManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState([]);
  const [cardData, setCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  const fetchServiceData = useCallback(async () => {
    if (!branchId || branchId === 'undefined') return;
    
    setIsLoading(true);;
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/services/get-branch-services.php?branch_id=${branchId}`);
      if(res.success) {
        setServices(res.data);
        setCardData(res.cardData);
      }
    } catch (error) { toast.error("Something went wrong"); }
    finally { setIsLoading(false); }
  }, [branchId]);

  useEffect(() => { fetchServiceData(); }, [fetchServiceData]);

  const handleToggleStatus = async (service) => {
    const isArchiving = Number(service.status) === 1;
    const newStatus = isArchiving ? 0 : 1;

    // alert
    const result = await Swal.fire({
      title: isArchiving ? 'Archive Product?' : 'Restore Product?',
      text: `Are you sure you want to ${isArchiving ? 'archive' : 'restore'} "${service.custom_name}?"`,
      icon: isArchiving ? 'warning' : 'info',
      buttonsStyling: false,
      showCancelButton: true,
      confirmButtonText: isArchiving ? 'Yes, Archive' : 'Yes, Restore',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        confirmButton: `rounded-lg px-5 py-2.5 cursor-pointer duration-300 ease-in-out active:scale-95 text-white text-sm font-bold 
        ${isArchiving ? 'bg-red-500 hover:bg-red-600' : 'bg-(--clr-primary)/95 hover:bg-(--clr-primary)'}
        `,
        cancelButton: 'rounded-lg px-5 py-2.5 active:scale-95 duration-300 ease-in-out cursor-pointer text-sm font-bold'
      }
    });

    if(result.isConfirmed) {
      showLoader();
      const res = await authFetch(`${API_URL}/api/clinic/general/services/update-service-status.php`, {
        method: 'POST',
        body: JSON.stringify({ branch_service_id: service.branch_service_id, status: newStatus })
      });
      if (res.success) { toast.success(res.message); fetchServiceData(); }
      hideLoader();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Service Management</h1>
            <p className="text-gray-500">Manage clinic services and service pricing</p>
          </div>
        </div>
        
        {isLoading ? (
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