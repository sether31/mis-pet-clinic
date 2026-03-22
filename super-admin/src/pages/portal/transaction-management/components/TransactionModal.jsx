import { HiXCircle, HiDownload } from 'react-icons/hi';

export default function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null;

  const history = transaction.history || [];
  const isActive = transaction.status?.toLowerCase() === 'active';
  const isExpired = transaction.status?.toLowerCase() === 'expired';

  const handleDownload = () => {
    const pdfUrl = `${import.meta.env.VITE_API_URL}/api/super-admin/transaction/generate-sub-payment-history-pdf.php?id=${transaction.id}`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl max-h-[95vh] overflow-hidden bg-white rounded-2xl text-left shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-800 uppercase">Transaction Details</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                isActive ? 'bg-green-50 text-(--clr-primary) border-green-200' : 
                isExpired ? 'bg-red-50 text-red-600 border-red-200' : 
                'bg-gray-100 text-gray-500 border-gray-300'
              }`}>
                {transaction.status || 'Unsubscribed'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              CLINIC ID: #{transaction.id} • EXPIRATION: {transaction.expiration_date ? new Date(transaction.expiration_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto bg-white no-scrollbar">   
          {/* clinic info */}
          <div className="grid grid-cols-2 gap-6 p-4 border border-gray-300 rounded-xl bg-gray-100/50">
            <div>
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider">Clinic Name</label>
              <p className="font-bold capitalize">{transaction.clinic_name}</p>
              <p className="text-xs font-medium text-gray-700 capitalize">Branch: {transaction.branch_name}</p>
              
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                Member Since: {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider">Current Plan</label>
              <p className="font-bold text-gray-800 uppercase">{transaction.plan_name || 'None'}</p>
              <p className="text-xs font-medium text-gray-700">Status: {transaction.status}</p>
              
              <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wide">
                Total Payments: {history.length}
              </p>
            </div>
          </div>

          {/* payment table */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase">Payment History</h3>
            <table className="relative w-full text-sm">
              {/* header */}
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-[12px] font-black text-gray-400 uppercase border-b border-gray-300">
                  <th className="py-2 text-left text-gray-700">Description & Date</th>
                  <th className="py-2 text-center text-gray-700">Method / Status</th>
                  <th className="py-2 text-right text-gray-700">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {history.length > 0 ? history.map((payment, idx) => (
                  <tr key={`pay-${idx}`}>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-700 capitalize">{transaction.plan_name || 'Subscription'}</p>                   
                        {/* current sub*/}
                        {idx === 0 && (transaction.status?.toLowerCase() === 'active' || transaction.status?.toLowerCase() === 'expired') && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black tracking-widest text-white uppercase bg-indigo-500 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col mt-1">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Created:</span>
                        <span className="text-[10px] text-blue-500 font-bold uppercase">
                          {new Date(payment.payment_date).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center align-top">
                      <p className="text-gray-500 uppercase text-[10px] font-bold tracking-widest mt-1">{payment.payment_method || 'Online'}</p>
                      <span className={`text-[9px] font-black uppercase ${payment.status === 'paid' ? 'text-(--clr-primary)' : 'text-amber-500'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3 pl-2 font-bold tracking-tight text-right text-gray-800 align-top">
                      <div className="mt-1">₱{Number(payment.amount || 0).toLocaleString()}</div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="py-8 text-xs italic text-center text-gray-400">No payment history recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* footer */}
        <div className="shrink-0 p-6 bg-white border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.02)]">
          
          <div className="p-4 mb-4 text-white bg-gray-900 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</p>
                <p className="text-2xl italic font-black">₱{Number(transaction.amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDownload} 
            className="flex items-center justify-center w-full gap-2 py-4 text-sm font-black tracking-widest text-white uppercase bg-(--clr-primary)/95 hover:bg-(--clr-primary) rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            <HiDownload size={20}/> Download Billing History
          </button>
        </div>

      </div>
    </div>
  );
}