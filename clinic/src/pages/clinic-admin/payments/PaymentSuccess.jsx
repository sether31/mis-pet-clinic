import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
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
          body: JSON.stringify({ 
            xendit_invoice_id: xendit_id,
            branch_id,
            subscription_id: sub_id
          })
        });

        if(response.success) {
          toast.success("Subscription activated successfully!");
          await wait(2000);
          navigate(`/clinic/select-branch`, { replace: true });
        } else {
          toast.error("Something went wrong");
          hideLoader();
        }

      } catch(err) {
        console.error("error: ", err);
        toast.error("Service unavailable");
        hideLoader();
      }
    };

    verifyPayment();
  }, [searchParams, navigate, showLoader, hideLoader]);

  return (
    <div className="min-h-screen bg-(--clr-bg-page) flex flex-col items-center justify-center p-6">
      <div className="text-center">
        <p className="font-medium animate-pulse">
          Verifying...
        </p>
      </div>
    </div>
  );
}