// icons
import { HiXCircle, HiDownload } from 'react-icons/hi';

export default function TransactionModal({ transaction, onClose }) {
  if (!transaction) return null;

  const services = transaction.items?.filter(item => item.service_id) || [];
  const products = transaction.items?.filter(item => item.product_id) || [];
  
  const isPaid = transaction.transaction_status?.toLowerCase() === 'paid' || 
                 transaction.transaction_status?.toLowerCase() === 'completed';

  const handleDownload = () => {
    const pdfUrl = `${import.meta.env.VITE_API_URL}/api/clinic/general/billing/generate-transaction-pdf.php?id=${transaction.transaction_id}`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-2xl text-left no-scrollbar">
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0 bg-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-800 uppercase">Transaction Details</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${isPaid ? 'bg-green-50 text-green-600 border-green-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              ID: #TRANSAC-{transaction.transaction_id} • {transaction.transaction_date}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* content */}
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-2 gap-8 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
            <div>
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider">Client & Pet</label>
              <p className="font-bold capitalize">{transaction.owner_name || 'Walk-in Customer'}</p>
              <p className="text-xs font-medium text-gray-700 capitalize">Pet: {transaction.pet_name || 'N/A'}</p>
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-700 uppercase tracking-wider">Branch & Payment</label>
              <p className="font-bold text-gray-800 uppercase">{transaction.branch_name}</p>
              <p className="text-xs font-medium text-gray-700">Method: {transaction.payment_method || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase border-b border-gray-100">
                  <th className="pb-2 text-left text-gray-700">Description</th>
                  <th className="pb-2 text-center text-gray-700">Qty</th>
                  <th className="pb-2 text-right text-gray-700">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((item, idx) => (
                  <tr key={`svc-${idx}`}>
                    <td className="py-3">
                      <p className="font-bold text-gray-700 capitalize">{item.service_name}</p>
                      <span className="text-[10px] text-blue-500 font-bold uppercase">Service</span>
                    </td>
                    <td className="py-3 text-center text-gray-500">1</td>
                    <td className="py-3 font-bold tracking-tight text-right text-gray-800">₱{Number(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {products.map((item, idx) => (
                  <tr key={`prod-${idx}`}>
                    <td className="py-3">
                      <p className="font-bold text-gray-700 capitalize">{item.product_name}</p>
                      <span className="text-[10px] text-purple-500 font-bold uppercase">Product</span>
                    </td>
                    <td className="py-3 text-center text-gray-500">{item.quantity}</td>
                    <td className="py-3 font-bold tracking-tight text-right text-gray-800">₱{Number(item.subtotal || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* total */}
          <div className="p-4 text-white bg-gray-900 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Amount</p>
                <p className="text-2xl italic font-black">₱{Number(transaction.amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleDownload} 
            className="flex items-center justify-center w-full gap-2 py-4 text-sm font-black tracking-widest text-white uppercase bg-(--clr-primary)/95 hover:bg-(--clr-primary) rounded-xl transition-all active:scale-95 cursor-pointer mt-4"
          >
            <HiDownload size={20}/> Download PDF Receipt
          </button>
        </div>
      </div>
    </div>
  );
}