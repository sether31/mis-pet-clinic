import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// components
import { authFetch } from '../../utils/authFetch';
import FullScreenLoader from '../../components/FullLoader';
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
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/get-active-plans.php`, {}, ['clinic_admin']);
        if(!response.success) {
          toast.error("Something went wrong");
          setLoading(false);
          return;
        }
        setSubscriptions(response.data);
      } catch(err) {
        console.error("Error fetching branches:", err);
        toast.error("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [])

  const handleClose = () => {
    navigate("/clinic/select-branch")
  }

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
    

        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Select Subscription Plan</h1>
          <p className="mt-1 text-lg text-gray-500">Choose a plan to activate your clinic branch features.</p>
        </div>

        {!loading && subscriptions.length > 0 && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4"
          >
            {subscriptions.map((sub) => {
              return (
                <motion.div 
                  key={sub.subscription_id}
                  variants={cardVariants}
                  className="flex flex-col p-8 transition-all bg-white border border-gray-300 shadow-sm rounded-xl hover:border-(--clr-primary) hover:shadow-(--clr-primary) hover:scale-105 ease-in-out duration-300"
                >
                  <div className="mb-8">
                    <h2 className="text-xl font-bold capitalize">{sub.name}</h2>
                    <div className="flex items-baseline mt-4">
                      <span className="text-4xl font-extrabold">₱{sub.price}</span>
                      <span className="ml-1 text-sm font-medium text-gray-500">/ {sub.duration_months} mo</span>
                    </div>
                  </div>

                  {/* subscription features */}
                  <ul className="flex-1 space-y-5">
                    {/* email */}
                    <li className="flex items-center gap-3 text-sm">
                      {Number(sub.has_unlimited_email) === 1 ? (
                        <HiCheck className="text-(--clr-text-header) shrink-0" size={20} />
                      ) : (
                        <HiXMark className="text-gray-300 shrink-0" size={20} />
                      )}
                      <span className={Number(sub.has_unlimited_email) ? "text-gray-600" : "text-gray-400"}>
                        Unlimited Email Notifications
                      </span>
                    </li>

                    {/* appointment */}
                    <li className="flex items-center gap-3 text-sm text-gray-600">
                      <HiCheck className="text-(--clr-text-header) shrink-0" size={20} />
                        {parseInt(sub.appointment_limit) > 1000 ? (
                          <span><strong>unlimited</strong> Appointment Limit</span>
                        ) : (
                          <span><strong>{sub.appointment_limit}</strong> Appointment Limit</span>
                        )}
                    </li>
                    
                    {/* market place */}
                    <li className="flex items-center gap-3 text-sm">
                      {Number(sub.has_marketplace) === 1 ? (
                        <HiCheck className="text-(--clr-text-header) shrink-0" size={20} />
                      ) : (
                        <HiXMark className="text-gray-300 shrink-0" size={20} />
                      )}
                      <span className={Number(sub.has_marketplace) ? "text-gray-600" : "text-gray-400"}>
                        Marketplace Access
                      </span>
                    </li>
                  </ul>

                  <button
                    className="mt-10 w-full py-3.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-(--clr-primary) transition-colors active:scale-95 cursor-pointer duration-300 ease-in-out"
                  >
                    Select {sub.name} Plan
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
      {loading && <FullScreenLoader message={loadingMessage} />}
    </>
  );
}