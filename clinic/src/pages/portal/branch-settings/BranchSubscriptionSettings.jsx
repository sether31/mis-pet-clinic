import { useState, useEffect } from 'react';
import { useParams} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// icons
import { HiCheck, HiXMark, HiOutlineShieldCheck, HiLockClosed } from "react-icons/hi2";

const API_URL = import.meta.env.VITE_API_URL;

export default function BranchSubscriptionSettings() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  
  const [subscriptions, setSubscriptions] = useState([]); 
  const [currentSub, setCurrentSub] = useState(null);      
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      showLoader("Loading plans...");
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
        hideLoader();
      }
    };
    if (branchId) loadData();
  }, [branchId]);

  const currentPrice = Number(currentSub?.price || 0);
  const currentPlanId = currentSub?.subscription_id;
  const expiryDate = currentSub?.end_date;
  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : true;

  const handleSelectPlan = async (e, sub, method) => {
    if (e) e.preventDefault();
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
          // disabled if active and try to pick downgrade
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

              {/* features */}
              <ul className="flex-1 mb-8 space-y-5 text-left">
                <FeatureItem active={Number(sub.has_email) === 1} label="Email Notifications" />
                <FeatureItem active={Number(sub.has_medical) === 1} label="Medical Record Access" />
                
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <HiCheck className="text-blue-500 shrink-0" size={20} />
                  <span><strong>{parseInt(sub.appointment_limit) > 1000 ? 'Unlimited' : sub.appointment_limit}</strong> Appointment Limit</span>
                </li>

                <FeatureItem active={Number(sub.has_shop) === 1} label="Shop Reservation & Inventory" />
              </ul>

              {/* button */}
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

                {/* warning */}
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
    

      {/* payment modal */}
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
                <h3 className="text-xl font-black tracking-tight uppercase">Confirm Payment</h3>
                <p className="mt-1 text-sm text-gray-700">Pay ₱{Number(selectedSub.price).toLocaleString()} for {selectedSub.name} plan.</p>
              </div>

              <div className="p-6 space-y-3">
                <button 
                  onClick={(e) => handleSelectPlan(e, selectedSub, 'GCASH')}
                  className="flex items-center justify-between w-full p-4 transition-all border border-gray-100 cursor-pointer group rounded-xl hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 text-xl font-black text-white bg-blue-600 rounded-xl">G</div>
                    <span className="text-lg font-bold text-gray-800">GCash</span>
                  </div>
                  <HiCheck className="text-blue-600 transition-opacity opacity-0 group-hover:opacity-100" size={24} />
                </button>

                <button 
                  onClick={(e) => handleSelectPlan(e, selectedSub, 'PAYMAYA')}
                  className="flex items-center justify-between w-full p-4 transition-all border-2 border-gray-100 cursor-pointer group rounded-2xl hover:border-green-500 hover:bg-green-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 text-xl font-black text-white bg-(--clr-primary) rounded-xl">M</div>
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