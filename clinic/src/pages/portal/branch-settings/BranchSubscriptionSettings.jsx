import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import LoaderV2 from '../../../components/LoaderV2';
// icons
import { HiCheck, HiXMark, HiOutlineShieldCheck, HiLockClosed, HiCreditCard, HiShieldCheck } from "react-icons/hi2";
import { IoIosCloseCircleOutline } from 'react-icons/io';

const API_URL = import.meta.env.VITE_API_URL;

export default function BranchSubscriptionSettings() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const [isLoading, setIsLoading] = useState(true);
  
  const [subscriptions, setSubscriptions] = useState([]); 
  const [currentSub, setCurrentSub] = useState(null);      
  const [selectedSub, setSelectedSub] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);

  const closeModal = () => {
    setSelectedSub(null);
    setAgreedToTerms(false);
    setPaymentMethod(null);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [resAll, resCurrent] = await Promise.all([
          authFetch(`${API_URL}/api/clinic/clinic-admin/subscription/get-active-subscription.php`),
          authFetch(`${API_URL}/api/clinic/general/branch-settings/subscription/get-branch-current-subscription.php?branch_id=${branchId}`)
        ]);

        if (resAll.success) setSubscriptions(resAll.data);
        if (resCurrent.success) setCurrentSub(resCurrent.data);
      } catch (err) {
        toast.error("Failed to load subscription data");
      } finally {
        setIsLoading(false);
      }
    };
    if (branchId) loadData();
  }, [branchId]);

  const currentPrice = Number(currentSub?.price || 0);
  const currentPlanId = currentSub?.subscription_id;
  const expiryDate = currentSub?.end_date;
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : true;

  // UPDATED: Fixed argument order to match the button call
  const handleSelectPlan = async (sub, method) => {
    setSelectedSub(null);
    showLoader(`Opening ${method} payment...`);

    try {
      const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/payments/subscription-payment.php`, {
        method: 'POST',
        body: JSON.stringify({
          subscription_id: sub.subscription_id,
          branch_id: branchId,
          amount: sub.price,
          plan_name: sub.name,
          payment_method: method,
          is_resubscribe: true 
        })
      });

      if(response.success && response.checkout_url) {
        window.location.href = response.checkout_url;
      } else {
        toast.error(response.message || "Payment initialization failed.");
        hideLoader();
      }
    } catch (err) {
      toast.error("Service unavailable");
      hideLoader();
    }
  };

  const formattedExpiry = expiryDate 
  ? new Date(expiryDate).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  : "N/A";

  if(isLoading) {
    return <LoaderV2 />;
  }

  return (
    <div className="space-y-8">
      {/* header*/}
      <div className="relative flex flex-col items-center justify-between gap-4 p-6 overflow-hidden text-white bg-gray-900 rounded-2xl md:flex-row">
        <div className="z-10 text-center md:text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Current Subscription Plan Status
          </p>
          
          <h2 className="text-2xl font-bold capitalize">
            {currentSub?.plan_name || ""}
            {isExpired && currentSub && (
              <span className="ml-2 text-[10px] bg-red-600 px-2 py-1 rounded-full align-middle">
                EXPIRED
              </span>
            )}
          </h2>

          {currentSub?.end_date && (
            <p className="flex items-center gap-1 mt-1 text-sm text-gray-400">
              <HiOutlineShieldCheck className={isExpired ? "text-red-500" : "text-green-400"} />
              <span>
                {isExpired ? "Expired on: " : "Valid until: "} 
                <span className="font-bold text-white">
                  {formattedExpiry}
                </span>
              </span>
            </p>
          )}
        </div>

        <div className="z-10 px-4 py-2 text-center border bg-white/10 rounded-xl border-white/10 backdrop-blur-md md:text-left">
          <p className="text-[10px] font-bold text-blue-400 uppercase">
            {isExpired ? "Account Inactive" : "Time Continuity"}
          </p>
          <p className="text-[11px] text-gray-300 leading-tight">
            {isExpired 
              ? "Select a plan below to restore access to your branch." 
              : "Your remaining days will be added to your new subscription plan."
            }
          </p>
        </div>
      </div>

      {/* select plan */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {subscriptions.map((sub) => {
          const isCurrent = Number(sub.subscription_id) === Number(currentPlanId);
          const planPrice = Number(sub.price);
          const isDowngrade = planPrice < currentPrice;
          const isDisabled = !isExpired && isDowngrade && !isCurrent;

          return (
            <div 
              key={sub.subscription_id} 
              className={`flex flex-col p-8 transition-all bg-white border rounded-xl relative ease-in-out duration-300 h-full ${
                isDisabled 
                ? 'bg-gray-50 border-gray-200 cursor-not-allowed' 
                : 'border-(--clr-primary) hover:border-(--clr-primary) hover:scale-103'
              }`}
            >
              {isDisabled && (
                <div className="absolute top-4 right-4 text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded text-[10px] font-bold border border-amber-100">
                  <HiLockClosed /> LOCKED
                </div>
              )}

              <div className="mb-8 text-left">
                <h2 className="text-xl font-bold text-gray-800 capitalize">{sub.name}</h2>
                <div className="flex items-baseline mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    ₱{Number(sub.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="ml-1 text-sm font-medium text-gray-500">/ {sub.duration_months} mo</span>
                </div>
              </div>

              <ul className="flex-1 mb-8 space-y-5 text-left">
                <FeatureItem active={Number(sub.has_email) === 1} label="Email Notifications" />
                <FeatureItem active={Number(sub.has_medical) === 1} label="Medical Record Access" />
                
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <HiCheck className="text-blue-500 shrink-0" size={20} />
                  <span><strong>{parseInt(sub.appointment_limit) > 1000 ? 'Unlimited' : sub.appointment_limit}</strong> Appointment Limit</span>
                </li>

                <FeatureItem active={Number(sub.has_shop) === 1} label="Shop Reservation & Inventory" />
              </ul>

              <div className="mt-auto space-y-3">
                <button
                  disabled={isDisabled}
                  onClick={() => setSelectedSub(sub)}
                  className={`w-full py-4 rounded-xl font-bold transition-all active:scale-95 cursor-pointer duration-300 ${
                    isDisabled 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : isCurrent 
                        ? 'bg-(--clr-primary) text-white hover:bg-(--clr-primary)' 
                        : 'bg-gray-900 text-white hover:bg-(--clr-primary)'
                  }`}
                >
                  {isCurrent ? "Renew Plan" : isDisabled ? "Locked" : `Select ${sub.name} Plan`}
                </button>

                <div className="h-4"> 
                  {isDowngrade && (
                    <p className="text-[10px] text-center text-amber-600 font-medium italic leading-tight">
                      * Available after current sub expires
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden"
            >
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
    </div>
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