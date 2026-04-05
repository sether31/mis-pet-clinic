import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import LoaderV2 from '../../../../components/LoaderV2';
// sub components
import FAQTable from '../components/FAQTable';
import FAQModal from '../components/FAQModal';
import { RiQuestionLine } from 'react-icons/ri';

const API_URL = import.meta.env.VITE_API_URL;

export default function FAQManagement() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState(null);

  const fetchFAQs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/public-data/get-accordion.php`);
      
      const res = await response.json(); 

      if (res.success) {
        setFaqs(res.data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load FAQ items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);

  const handleToggleStatus = async (faq) => {
    const isArchiving = Number(faq.status) === 1;
    const newStatus = isArchiving ? 0 : 1;

    const result = await Swal.fire({
      title: isArchiving ? 'Archive FAQ?' : 'Activate FAQ?',
      text: `Are you sure you want to ${isArchiving ? 'archive' : 'activate'} "${faq.question}?"`,
      icon: isArchiving ? 'warning' : 'info',
      buttonsStyling: false,
      showCancelButton: true,
      confirmButtonText: isArchiving ? 'Yes, Archive' : 'Yes, Activate',
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
      setLoading(true); 
      try {
        const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/faq/update-accordion.php`, {
          method: 'POST',
          body: JSON.stringify({ ...faq, status: newStatus }) 
        });
        if (res.success) { 
          toast.success(res.message); 
          fetchFAQs(); 
        }
      } catch(error) {
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8">

      <section className='flex-1 w-full mb-6'>
        <div className="flex flex-col items-center gap-2 mb-8 text-center sm:text-left sm:flex-row">
          <div className="rounded-lg text-gray-700">
            <RiQuestionLine size={36} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Landing Page FAQ</h2>
            <p className="text-sm text-gray-500">
              Create, edit, and organize the questions for landing page.
            </p>
          </div>
        </div>
        
        {loading ? (
          <LoaderV2 />
        ) : (
          <div className="mt-8">
            <FAQTable 
              data={faqs} 
              onEdit={(item) => { setSelectedFAQ(item); setIsModalOpen(true); }}
              onToggleStatus={handleToggleStatus}
              onCreate={() => { setSelectedFAQ(null); setIsModalOpen(true); }}
            />
          </div>
        )}
      </section>

      {isModalOpen && (
        <FAQModal 
          initialData={selectedFAQ} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchFAQs} 
        />
      )}
    </div>
  );
}