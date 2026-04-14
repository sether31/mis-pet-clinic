import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI';
// utils
import { authFetch } from '../../utils/authFetch';
// icons
import { HiCheck, HiXMark } from "react-icons/hi2";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { HiCreditCard, HiShieldCheck } from 'react-icons/hi';

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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);

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

  const closeModal = () => {
    setSelectedSub(null);
    setAgreedToTerms(false);
    setPaymentMethod(null);
  };

  const handleSelectPlan = async (sub, method) => {
    if (!agreedToTerms) return toast.warn("Please agree to the terms first.");
    
    showLoader(`Opening ${method}...`);
    try {
      const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/payments/subscription-payment.php`, {
        method: 'POST',
        body: JSON.stringify({
          subscription_id: sub.subscription_id,
          branch_id: branchId,
          amount: sub.price,
          plan_name: sub.name,
          payment_method: method, // Now supports 'CARD', 'GCASH', 'PAYMAYA'
          is_resubscribe: false
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
              <IoIosCloseCircleOutline size={32} />
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
                  <FeatureItem active={Number(sub.has_email) === 1} label="Email Notifications" />
                  <FeatureItem active={Number(sub.has_medical) === 1} label="Medical Record Access" />
                  
                  <li className="flex items-center gap-3 text-sm text-gray-600">
                    <HiCheck className="text-blue-500 shrink-0" size={20} />
                    <span><strong>{parseInt(sub.appointment_limit) > 1000 ? 'Unlimited' : sub.appointment_limit}</strong> Appointment Limit</span>
                  </li>

                  <FeatureItem active={Number(sub.has_shop) === 1} label="Shop Reservation & Inventory" />
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
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
            >
              {/* Close Icon at Top Right */}
              <button 
                onClick={closeModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10 cursor-pointer"
              >
                <IoIosCloseCircleOutline size={28} />
              </button>

              <div className="p-6 text-center border-b border-gray-50 bg-gray-50/50 shrink-0">
                <h3 className="text-xl font-black tracking-tight uppercase text-gray-800">Selected Plan</h3>
                <p className="mt-1 text-sm font-bold flex gap-1 justify-center">
                  <span className="text-gray-800 uppercase">{selectedSub.name}</span> — 
                  <span className='text-(--clr-primary)'>
                    ₱{Number(selectedSub.price).toLocaleString()}
                  </span>
                </p>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {/* Terms and Conditions (Same Design) */}
                <div className="p-4 mb-6 border border-amber-100 rounded-2xl bg-amber-50/50">
                  <div className="flex items-center gap-2 mb-3 text-amber-700">
                    <HiShieldCheck size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Terms of Service</span>
                  </div>
                  <ul className="space-y-2 text-[13px] text-amber-900/80 leading-relaxed">
                    <li className="flex gap-2">
                      <span className="font-bold">•</span>
                      <span><b>Non-Refundable:</b> All subscription payments are final.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">•</span>
                      <span><b>Downgrade Policy:</b> No downgrades until the current period expires.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold">•</span>
                      <span><b>Upgrades:</b> You may upgrade or renew at any time.</span>
                    </li>
                  </ul>
                  
                  <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setAgreedToTerms(e.target.checked);
                        if(!e.target.checked) setPaymentMethod(null);
                      }}
                      className={`w-5 h-5 border-2 rounded transition-colors cursor-pointer focus:ring-0 
                        ${agreedToTerms 
                          ? "bg-(--clr-primary) border-(--clr-primary) text-(--clr-primary)" 
                          : "bg-white border-amber-300 text-transparent"
                        }`}
                    />
                    <span className="text-sm font-bold text-amber-900">
                      I agree to the terms
                    </span>
                  </label>
                </div>

                {/* Payment Methods Section */}
                <div className={`space-y-3 transition-all duration-500 ${agreedToTerms ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none grayscale'}`}>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Payment Method</p>
                  
                  <PaymentOption 
                    active={paymentMethod === 'CARD'} 
                    onClick={() => setPaymentMethod('CARD')}
                    icon={<HiCreditCard size={24} />}
                    label="Credit / Debit Card"
                    sub="Visa, Mastercard, JCB"
                    bgColor="bg-gray-800"
                  />

                  <PaymentOption 
                    active={paymentMethod === 'GCASH'} 
                    onClick={() => setPaymentMethod('GCASH')}
                    icon="G"
                    label="GCash"
                    bgColor="bg-blue-600"
                  />

                  <PaymentOption 
                    active={paymentMethod === 'PAYMAYA'} 
                    onClick={() => setPaymentMethod('PAYMAYA')}
                    icon="M"
                    label="Maya"
                    bgColor="bg-(--clr-primary)"
                  />
                </div>

                {/* Final Confirm Button (Only shows when method is selected) */}
                <AnimatePresence>
                  {paymentMethod && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6"
                    >
                      <button 
                        onClick={() => handleSelectPlan(selectedSub, paymentMethod)}
                        className="w-full py-4 bg-(--clr-primary) text-white rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-(--clr-primary)/20 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                      >
                        Confirm & Pay Now
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!paymentMethod && (
                    <button 
                    onClick={closeModal}
                    className="w-full py-4 mt-4 text-xs font-bold tracking-widest text-gray-400 uppercase transition-colors cursor-pointer hover:text-red-500"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function FeatureItem({ active, label }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {active ? (
        <HiCheck className="text-blue-500 shrink-0" size={20} />
      ) : (
        <HiXMark className="text-gray-300 shrink-0" size={20} />
      )}
      <span className={active ? "text-gray-600 font-medium" : "text-gray-400"}>
        {label}
      </span>
    </li>
  );
}

function PaymentBtn({ label, sub, icon, color, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center justify-between w-full p-4 border border-gray-100 rounded-2xl hover:border-gray-900 hover:bg-gray-50 transition-all group active:scale-[0.98]"
    >
      <div className="flex items-center gap-4 text-left">
        <div className={`w-11 h-11 flex items-center justify-center rounded-xl text-white ${color} shadow-sm`}>
          {icon}
        </div>
        <div>
          <span className="block text-sm font-black text-gray-800 leading-none">{label}</span>
          {sub && <span className="text-[10px] text-gray-400 uppercase font-bold mt-1 block">{sub}</span>}
        </div>
      </div>
      <HiCheck className="text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
    </button>
  );
}

function PaymentOption({ active, onClick, icon, label, sub, bgColor }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between w-full p-4 transition-all border cursor-pointer group rounded-xl ${
        active ? 'border-(--clr-primary) bg-(--clr-primary)/5' : 'border-gray-100 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`flex items-center justify-center w-12 h-12 text-xl font-black text-white rounded-xl ${bgColor}`}>
          {icon}
        </div>
        <div className="text-left">
          <span className={`block text-sm font-black transition-colors ${active ? 'text-(--clr-primary)' : 'text-gray-800'}`}>
            {label}
          </span>
          {sub && <span className="block text-[10px] text-gray-400 uppercase">{sub}</span>}
        </div>
      </div>
      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        active ? 'border-(--clr-primary) bg-(--clr-primary)' : 'border-gray-200'
      }`}>
        {active && <HiCheck size={14} className="text-white" />}
      </div>
    </button>
  );
}