import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useUI } from '../../../hooks/useUI';
import wait from '../../../utils/wait';
import { authFetch } from '../../../utils/authFetch';

const API_URL = import.meta.env.VITE_API_URL;

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showLoader, hideLoader } = useUI();
  const hasCalled = useRef(false);

  useEffect(() => {
    if(hasCalled.current) return;

    const verifyPayment = async () => {
      const xendit_id = searchParams.get('id');
      const branch_id = searchParams.get('branch_id');
      const sub_id = searchParams.get('sub_id');
      const fromSettings = searchParams.get('from_settings') === 'true';

      if(!branch_id) {
        toast.error("Missing branch ID");
        navigate("/clinic/select-branch");
        return;
      }

      hasCalled.current = true;
      showLoader("Verifying Payment...");

      try {
        const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/payments/verify-payment.php`, {
          method: 'POST',
          body: JSON.stringify({ xendit_invoice_id: xendit_id, branch_id, subscription_id: sub_id })
        });

        if(response.success) {
          // Dynamic Message based on backend 'type'
          let msg = "Subscription activated!";
          if(response.type === 'upgrade') msg = "Plan successfully upgraded!";
          if(response.type === 'renewal') msg = "Subscription successfully extended!";
          
          toast.success(msg);
          await wait(2000);

          // Smart Redirect
          if(fromSettings) {
            navigate(`/clinic/${branch_id}/portal/branch-settings/subscription`, { replace: true });
          } else {
            navigate(`/clinic/select-branch`, { replace: true });
          }
        } else {
          toast.error(response.message || "Something went wrong");
          hideLoader();
        }
      } catch(err) {
        toast.error("Service unavailable");
        hideLoader();
      }
    };

    verifyPayment();
  }, [searchParams, navigate, showLoader, hideLoader]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl max-w-sm w-full">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-gray-800">Finalizing Payment</h2>
        <p className="text-gray-500 mt-2">Please wait while we update your account...</p>
      </div>
    </div>
  );
}