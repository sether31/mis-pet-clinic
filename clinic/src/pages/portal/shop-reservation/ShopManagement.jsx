import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useParams, useSearchParams } from 'react-router-dom';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2';
// sub components
import ShopTable from './components/ShopTable';
import ShopModal from './components/ShopModal';
import ShopCard from './components/ShopCard';

const API_URL = import.meta.env.VITE_API_URL;

export default function ShopManagement() {
  const { branchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showLoader, hideLoader } = useUI();
  
  const [isLoading, setIsLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [cardData, setCardData] = useState(null); 
  
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const orderIdToView = searchParams.get('view');
    
    // If we have an ID in the URL and our reservations list is loaded
    if (orderIdToView && reservations.length > 0) {
      const order = reservations.find(r => r.order_id.toString() === orderIdToView);
      if (order) {
        setSelectedOrder(order);
        setIsModalOpen(true);
        // clear
        setSearchParams({}, { replace: true }); 
      }
    }
  }, [searchParams, reservations]);

  const fetchReservations = useCallback(async () => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/shop/get-reservations.php?branch_id=${branchId}`);
      if (res.success) {
        setReservations(res.data);
        setCardData(res.cardData); 
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleUpdateStatus = async (orderId, newStatus, rejectReason = '') => {
    showLoader(`Updating to ${newStatus}...`);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/shop/update-reservation-status.php`, {
        method: 'POST',
        body: JSON.stringify({ 
          order_id: orderId, 
          status: newStatus,
          reason: (newStatus === 'cancelled' || newStatus === 'rejected') ? rejectReason : ''
        })
      });

      if(res.success) {
        toast.success(`Order marked as ${newStatus}!`);
        setIsModalOpen(false);
        fetchReservations(); 
      } else {
        toast.error("Something went wrong.");
      }
    } catch(error) {
      toast.error("Something went wrong.");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      
      <section className="flex-1 w-full px-6 my-6 container-xl">       
        {isLoading ? (
          <LoaderV2 />
        ) : (
          <>
            <div className="mb-6">
              <ShopCard data={cardData} />
            </div>

            <ShopTable
              data={reservations} 
              onReview={(order) => { 
                setSelectedOrder(order); 
                setIsModalOpen(true); 
              }} 
            />
          </>
        )}
      </section>

      {/* modal */}
      {isModalOpen && selectedOrder && (
        <ShopModal 
          order={selectedOrder} 
          onClose={() => setIsModalOpen(false)} 
          onUpdate={handleUpdateStatus} 
        />
      )}
    </div>
  );
}