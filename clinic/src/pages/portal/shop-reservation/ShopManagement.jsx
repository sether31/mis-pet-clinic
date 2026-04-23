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
import CreateReservationModal from './components/CreateReservationModal';
// sub components
import ShopTable from './components/ShopTable';
import ShopModal from './components/ShopModal';
import ShopCard from './components/ShopCard';
import { HiPlus } from 'react-icons/hi';
import SubscriptionGate from '../../../components/SubscriptionGate';

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
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

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

  // Add 'payment = null' as the 4th parameter
const handleUpdateStatus = async (orderId, newStatus, rejectReason = '', payment = null) => {
  showLoader(`Updating to ${newStatus}...`);
  try {
    const res = await authFetch(`${API_URL}/api/clinic/general/shop/update-reservation-status.php`, {
      method: 'POST',
      body: JSON.stringify({ 
        order_id: orderId, 
        status: newStatus,
        reason: (newStatus === 'cancelled' || newStatus === 'rejected') ? rejectReason : '',
        // FIX: Spread the payment object (cash_received, cash_change) into the body
        ...payment 
      })
    });

    if(res.success) {
      toast.success(`Order marked as ${newStatus}!`);
      setIsModalOpen(false);
      fetchReservations(); 
    } else {
      toast.error(res.message || "Something went wrong.");
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
        <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shop Management</h1>
            <p className="text-gray-500">Process reservations or handle walk-in sales.</p>
          </div>
          
          <SubscriptionGate type="shop">
            <button 
              onClick={() => setIsReservationModalOpen(true)}
              className="bg-(--clr-primary) text-white justify-center px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <HiPlus size={18}/> Direct Sale
            </button>
          </SubscriptionGate>
        </div>

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

      {isReservationModalOpen && (
          <CreateReservationModal 
            branchId={branchId} 
            onClose={() => setIsReservationModalOpen(false)} 
            onRefresh={fetchReservations} 
          />
        )}
    </div>
  );
}