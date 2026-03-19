import { useState, useEffect, useCallback } from 'react';
// hooks
import { useUI } from '../../hooks/useUI'; 
// utils
import { authFetch } from '../../utils/authFetch';
// components
import Header from '../../components/Header';
import LoaderV2 from '../../components/LoaderV2';
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
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) showLoader('Refreshing Data...'); 
    setLoading(true);
    
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
      setLoading(false);
    }
  }, [showLoader]); 

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
    <div className='min-h-screen bg-gray-100'>
      <Header />

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className='pb-6'>
          <h1 className="text-2xl font-bold tracking-tight">
            Transaction Management Overview
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Monitor revenue and subscription billing history
          </p>
        </div>

        {loading ? (
          <LoaderV2 />
        ) : (
          <>
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
          </>
        )}
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