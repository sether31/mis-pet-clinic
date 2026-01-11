import { useNavigate, useSearchParams } from 'react-router-dom';
// icons
import { HiXCircle, HiArrowPath } from "react-icons/hi2";

export default function PaymentFailed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const branch_id = searchParams.get('branch_id');

  const handleTryAgain = () => {
    if(branch_id) {
      navigate(`/clinic/${branch_id}/admin/select-plan}`);
    } else {
      navigate('/clinic/select-branch');
    }
  };

  return (
    <div className="min-h-screen bg-(--clr-bg-page) flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center w-full max-w-sm text-center">
        <div className="mb-6 text-red-500">
          <HiXCircle size={80} />
        </div>

        <h1 className="mb-2 text-2xl font-bold">
          Payment Unsuccessful
        </h1>

        <p className="mb-8 leading-relaxed text-gray-500">
          We couldn't process your transaction. This might be due to insufficient funds or a temporary connection issue.
        </p>
          
        <button
          onClick={handleTryAgain}
          className="w-full py-3.5 bg-(--clr-text-primary) text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-(--clr-text-primary)/95 transition-all active:scale-95 cursor-pointer"
        >
          <HiArrowPath size={20} />
          Try Again
        </button>

        <button
          onClick={() => navigate('/clinic/select-branch')}
          className="mt-6 text-sm text-gray-600 underline cursor-pointer hover:text-(--clr-text-primary)"
        >
          Return to Branch Selection
        </button>
      </div>
    </div>
  );
}