import { useState, useEffect, useCallback } from 'react';
// hooks
import { useUI } from '../../hooks/useUI'; 
// utils
import { authFetch } from '../../utils/authFetch';
// sub components
import Header from '../../components/Header';
import TransactionCard from './components/TransactionCard';
import TransactionTable from './components/TransactionTable';
import TransactionModal from './components/TransactionModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionManagement() {
  const { showLoader, hideLoader } = useUI(); 
  const [subscriptions, setSubscriptions] = useState([]); 
  const [summary, setSummary] = useState({
    totalActive: 0,
    totalExpired: 0,
    totalRevenue: 0
  });

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) showLoader('Refreshing Data...'); 
    
    try {
      const res = await authFetch(`${API_URL}/api/super-admin/transaction/get-all-subscriptions.php`);
      
      if(res?.success) {
        setSubscriptions(res.data || []); 
        setSummary(res.summary || { totalActive: 0, totalExpired: 0, totalRevenue: 0 }); 
      }
    } catch(err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      hideLoader(); 
    }
  }, [showLoader, hideLoader]); 

  useEffect(() => { 
    fetchAll(false); 
  }, [fetchAll]);

  // modal
  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <section className="w-full px-4 py-6 m-b-6 md:px-8 container-xl">
        <div className="space-y-6">
          {/* card */}
          <TransactionCard summary={summary} data={subscriptions} />

          {/* table */}
          <div className="w-full">
            <TransactionTable
              data={subscriptions} 
              onViewDetails={handleViewDetails}
            />
          </div>
        </div>
      </section>


      {/* modal */}
      {isModalOpen && selectedTransaction && (
        <TransactionModal 
          transaction={selectedTransaction} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}