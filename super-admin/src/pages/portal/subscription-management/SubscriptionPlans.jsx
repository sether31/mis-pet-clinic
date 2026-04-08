import { useState, useEffect } from 'react'
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
// utils
import { authFetch } from '../../../utils/authFetch';
// component
import Header from '../../../components/Header'
import LoaderV2 from '../../../components/LoaderV2';
import DashboardCard from '../../../components/DashboardCard'
import SubscriptionTable from './components/SubscriptionTable'
import SubscriptionModal from './components/SubscriptionModal'
// icons
import { HiOutlineBadgeCheck } from 'react-icons/hi';
import { HiOutlineArchiveBoxXMark, HiOutlineSquare3Stack3D } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function SubscriptionPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  // fetch sub when the page mount
  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await authFetch(`${API_URL}/api/super-admin/subscription/get-subscription.php`);
      
      if(response.success && Array.isArray(response.data)) {
        setSubscriptions(response.data);
      } else {
        setSubscriptions([]); 
      }
    } catch(error) {
      console.error("Network Error:", error);
      toast.error("Something went wrong");
      setSubscriptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  // toggle archive and restore
  const handleToggleStatus = async (sub) => {
    const isArchiving = Number(sub.is_active) === 1;
    const newStatus = isArchiving ? 0 : 1;

    // 1. Show Confirmation Dialog
    const result = await Swal.fire({
      title: isArchiving ? 'Archive Subscription?' : 'Restore Subscription?',
      text: `Are you sure you want to ${isArchiving ? 'archive' : 'restore'} the "${sub.name}" plan?`,
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
        cancelButton: 'rounded-lg px-5 py-2.5 active:scale-95 duration-300 ease-in-out cursor-pointer text-sm font-bold border border-gray-200 ml-3'
      }
    });

    // 2. Proceed if user confirmed
    if (result.isConfirmed) {
      setLoading(true); // Use your existing loading state
      try {
        const response = await authFetch(`${API_URL}/api/super-admin/subscription/update-subscription.php`, {
          method: 'POST',
          body: JSON.stringify({ 
            ...sub,
            is_active: newStatus 
          })
        });
        
        if (response.success) {
          toast.success(response.message || (newStatus === 1 ? "Subscription Restored!" : "Subscription Archived!"));
          fetchSubscriptions(); // Refresh the list
        } else {
          toast.error(response.message || "Something went wrong");
        }
      } catch (error) {
        console.error("Update Error:", error);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  // actions for modal
  const handleEdit = (plan) => {
    setSelectedSubscription(plan);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedSubscription(null);
    setIsModalOpen(true);
  };

  return (
    <div className='min-h-screen bg-gray-100'>
      <Header />

      <section className='flex-1 w-full px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Subscription Management Overview</h1>
            <p className="text-gray-500">Configure and monitor platform service tiers</p>
          </div>
        </div>
        
        {loading ? (
          <LoaderV2 />
        ) : (
          <>
            {/* dashboard card */}
            <div className='grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3'>
              <DashboardCard 
                title='Total Subscriptions' 
                data={subscriptions.length} 
                icon={HiOutlineSquare3Stack3D} 
              />
              <DashboardCard 
                title='Active Subscriptions' 
                data={subscriptions.filter(s => Number(s.is_active) === 1).length} 
                icon={HiOutlineBadgeCheck} 
                iconColor='text-[var(--clr-text-header)]' 
              />
              <DashboardCard 
                title='Archived Subscriptions' 
                data={subscriptions.filter(s => Number(s.is_active) === 0).length} 
                icon={HiOutlineArchiveBoxXMark} 
                iconColor='text-red-500' 
              />
            </div>

            {/* subscription table */}
            <div className='pb-20'>
              <SubscriptionTable 
                data={subscriptions} 
                onEdit={handleEdit} 
                onToggleStatus={handleToggleStatus}
                onCreate={handleCreate}
              />
            </div>
          </>
        )}
      </section>

      {/* modal for add and edit */}
      {isModalOpen && (
        <SubscriptionModal 
          initialData={selectedSubscription}
          onClose={() => setIsModalOpen(false)}
          onRefresh={fetchSubscriptions}
        />
      )}
    </div>
  )
}