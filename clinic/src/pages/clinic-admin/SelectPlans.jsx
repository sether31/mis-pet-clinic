import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI';
// utils
import { authFetch } from '../../utils/authFetch';
// icons
import { HiCheck, HiXCircle, HiXMark } from "react-icons/hi2";

const API_URL = import.meta.env.VITE_API_URL;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};

export default function SelectPlans() {
  const navigate = useNavigate();
  const { branchId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showLoader, hideLoader } = useUI();
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'cancelled') {
      toast.info("Payment was cancelled. Feel free to try again.");
      setSearchParams({}, { replace: true }); 
    }

    const fetchPlans = async () => {
      showLoader();
      try {
        const res = await authFetch(`${API_URL}/api/clinic/clinic-admin/subscription/get-active-subscription.php`);
        if (res.success) {
          setSubscriptions(res.data);
        }
      } catch (err) {
        navigate("/clinic/select-branch");
      } finally {
        hideLoader();
      }
    };
    if (branchId) fetchPlans();
  }, [branchId, searchParams, setSearchParams]);

  const handleSelectPlan = async (sub, method) => {
    setSelectedSub(null);
    showLoader(`Opening ${method}...`);

    try {
      const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/payments/subscription-payment.php`, {
        method: 'POST',
        body: JSON.stringify({
          subscription_id: sub.subscription_id,
          branch_id: branchId,
          amount: sub.price,
          plan_name: sub.name,
          payment_method: method 
        })
      });

      if(response.success && response.checkout_url) {
        window.location.href = response.checkout_url;
      } else {
        toast.error("Something went wrong.");
        hideLoader();
      }
    } catch (err) {
      toast.error("Service unavailable");
      hideLoader();
    }
  };

  const handleClose = () => {
    navigate("/clinic/select-branch");
  };

  return (
    <>
      <div className="pt-20 pb-6 bg-(--clr-bg-page) container-xl">
        {/* nav */}
        <nav className="fixed top-0 left-0 z-50 w-full bg-(--clr-bg-page)/80 backdrop-blur-md">
          <div className="flex justify-end py-5 container-xl">
            <button 
              onClick={handleClose}
              className="text-gray-400 duration-300 ease-in-out cursor-pointer hover:text-red-500"
            >
              <HiXCircle size={32} />
            </button>
          </div>
        </nav>

        {/* header */}
        <div className="mb-10 text-left">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Select Subscription Plan</h1>
          <p className="mt-1 text-lg text-gray-500">Choose a plan to activate your clinic branch features.</p>
        </div>

        {/* subscription card */}
        {subscriptions.length > 0 && (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible" 
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
          >
            {subscriptions.map((sub) => (
              <motion.div 
                key={sub.subscription_id} 
                variants={cardVariants} 
                className="flex flex-col p-8 transition-all bg-white border border-gray-300 rounded-xl hover:border-(--clr-primary) hover hover:scale-105 ease-in-out duration-300"
              >
                <div className="mb-8 text-left">
                  <h2 className="text-xl font-bold text-gray-800 capitalize">{sub.name}</h2>
                  <div className="flex items-baseline mt-4">
                    <span className="text-4xl font-extrabold text-gray-900">
                      ₱{Number(sub.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="ml-1 text-sm font-medium text-gray-500">/ {sub.duration_months} mo</span>
                  </div>
                </div>

                <ul className="flex-1 space-y-5 text-left">
                  <li className="flex items-center gap-3 text-sm">
                    {Number(sub.has_email) === 1 ? (
                      <HiCheck className="text-(--clr-primary) shrink-0" size={20} />
                    ) : (
                      <HiXMark className="text-gray-300 shrink-0" size={20} />
                    )}
                    <span className={Number(sub.has_email) ? "text-gray-600 font-medium" : "text-gray-400"}>
                      Email Notifications
                    </span>
                  </li>

                  <li className="flex items-center gap-3 text-sm">
                    {Number(sub.has_medical) === 1 ? (
                      <HiCheck className="text-(--clr-primary) shrink-0" size={20} />
                    ) : (
                      <HiXMark className="text-gray-300 shrink-0" size={20} />
                    )}
                    <span className={Number(sub.has_medical) ? "text-gray-600 font-medium" : "text-gray-400"}>
                      Medical Record Access
                    </span>
                  </li>

                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <HiCheck className="text-(--clr-primary) shrink-0" size={20} />
                    {parseInt(sub.appointment_limit) > 1000 ? (
                      <span><strong>Unlimited</strong> Appointment Limit</span>
                    ) : (
                      <span><strong>{sub.appointment_limit}</strong> Appointment Limit</span>
                    )}
                  </li>
                  
                  <li className="flex items-center gap-3 text-sm">
                    {Number(sub.has_shop) === 1 ? (
                      <HiCheck className="text-(--clr-primary) shrink-0" size={20} />
                    ) : (
                      <HiXMark className="text-gray-300 shrink-0" size={20} />
                    )}
                    <span className={Number(sub.has_shop) ? "text-gray-600 font-medium" : "text-gray-400"}>
                      Shop Reservation & Inventory
                    </span>
                  </li>
                </ul>

                <button
                  onClick={() => setSelectedSub(sub)}
                  className="mt-10 w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-(--clr-primary) transition-all active:scale-95 cursor-pointer duration-300"
                >
                  Select {sub.name} Plan
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* modal card */}
      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 0 }}
              className="w-full max-w-sm overflow-hidden bg-white rounded-3xl"
            >
              <div className="p-8 text-center border-b border-gray-50 bg-gray-50/50">
                <h3 className="text-xl font-black tracking-tight uppercase">Payment Method</h3>
                <p className="mt-1 text-sm text-gray-700">Pay ₱{Number(selectedSub.price).toLocaleString()} for {selectedSub.name} plan.</p>
              </div>

              <div className="p-6 space-y-3">
                <button 
                  onClick={() => handleSelectPlan(selectedSub, 'GCASH')}
                  className="flex items-center justify-between w-full p-4 transition-all border border-gray-100 cursor-pointer group rounded-xl hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 text-xl font-black text-white bg-blue-600 rounded-xl">G</div>
                    <span className="text-lg font-bold text-gray-800">GCash</span>
                  </div>
                  <HiCheck className="text-blue-600 transition-opacity opacity-0 group-hover:opacity-100" size={24} />
                </button>

                <button 
                  onClick={() => handleSelectPlan(selectedSub, 'PAYMAYA')}
                  className="flex items-center justify-between w-full p-4 transition-all border-2 border-gray-100 cursor-pointer group rounded-2xl hover:border-green-500 hover:bg-green-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 text-xl font-black text-white bg-green-500 rounded-xl">M</div>
                    <span className="text-lg font-bold text-gray-800">Maya</span>
                  </div>
                  <HiCheck className="text-(--clr-primary) transition-opacity opacity-0 group-hover:opacity-100" size={24} />
                </button>

                <button 
                  onClick={() => setSelectedSub(null)}
                  className="w-full py-4 mt-2 text-sm font-bold tracking-widest text-gray-400 uppercase transition-colors cursor-pointer hover:text-red-500"
                >
                  Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}