import { useState, useEffect } from 'react';
import { HiChevronLeft, HiXCircle, HiOutlineShoppingCart, HiOutlineClipboardCheck, HiDownload, HiReceiptTax, HiMail, HiPhone } from 'react-icons/hi';
import NoImage from '../../../../assets/images/no-image.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function TransactionProfilingModal({ isOpen, onClose, owner, branchId, forcedStep }) {
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState([]);
  const [selectedType, setSelectedType] = useState('all'); 
  const isGuest = !owner?.user_id;

  useEffect(() => {
    if (isOpen) {
      setStep(forcedStep);
      setHistory(owner?.history || []);
    }
  }, [isOpen, forcedStep, owner]);

  const getAvatarUrl = (name) => {
    const bg = 'd1fae5';
    const color = '065f46';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}&bold=true`;
  };

  const handleDownloadPDF = (type = 'all') => {
    const params = new URLSearchParams();

    // 1. Add Identity
    if (isGuest) {
      params.append('transaction_id', owner.transaction_id);
    } else {
      params.append('user_id', owner.user_id);
    }

    // 2. Add Branch (ONLY if it's not "all" and not undefined)
    if (branchId && branchId !== 'all' && branchId !== 'undefined') {
      params.append('branch_id', branchId);
    }

    // 3. Add Type
    params.append('type', type);

    const url = `${API_URL}/api/clinic/general/billing/generate-transaction-pdf.php?${params.toString()}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  const displayedHistory = history.filter(tx => {
    const sourceType = tx.source_type?.toLowerCase() || '';

    if (selectedType === 'product') {
      return sourceType.includes('product') || sourceType.includes('retail');
    }
    
    if (selectedType === 'appointment') {
      return sourceType === 'appointment';
    }

    return true; 
  });

  const formatSafeDate = (dateString) => {
    if (!dateString) return "N/A";
    
    const formattedString = dateString.replace(' ', 'T');
    const date = new Date(formattedString);
    
    if (isNaN(date.getTime())) return "Invalid Date";

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl border border-gray-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 bg-white border-b sm:p-6 shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 && !isGuest ? (
              <button 
                onClick={() => { setStep(1); setSelectedType('all'); }} 
                className="p-2 text-gray-500 transition-all bg-gray-200 cursor-pointer rounded-xl hover:bg-gray-300 active:scale-90"
              >
                <HiChevronLeft size={20} />
              </button>
            ) : (
              <div className="p-2 text-white bg-(--clr-primary) rounded-xl">
                <HiReceiptTax size={20} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight text-gray-800 uppercase">Billing Profile</h2>
              <p className="text-[10px] font-black text-(--clr-primary) uppercase tracking-widest mt-1">
                {isGuest ? 'Guest Walk-in' : 'Registered Customer'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 transition-all cursor-pointer hover:text-red-500 active:scale-90">
            <HiXCircle className="w-8 h-8" />
          </button>
        </div>

        {/* BREADCRUMBS - Hidden for Guests */}
        {!isGuest && (
          <div className="flex items-center gap-2 px-6 py-3 shrink-0 border-b border-gray-50">
            {['Category', 'Transactions'].map((label, idx) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${step >= idx + 1 ? 'text-(--clr-primary)' : 'text-gray-400'}`}>
                  0{idx + 1}. {label}
                </div>
                {idx < 1 && <span className="text-gray-300">/</span>}
              </div>
            ))}
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="relative p-5 space-y-4 overflow-y-auto sm:p-8 min-h-[450px] bg-gray-50/30">
          
          {/* OWNER/GUEST INFO BOX */}
          <div className="flex items-start gap-4 p-4 border border-gray-400 rounded-2xl bg-white">
            <img 
              src={isGuest ? getAvatarUrl('Guest') : (owner.user_image || getAvatarUrl(owner.owner_name))}
              className="object-cover bg-white border border-gray-200 w-14 h-14 rounded-2xl shrink-0" 
              alt="avatar" 
              onError={(e) => { e.target.src = NoImage; }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black text-(--clr-primary) uppercase leading-none block mb-1 tracking-wider">
                {isGuest ? 'Guest' : 'Client Identity'}
              </span>
              <h3 className="text-sm font-black leading-none text-gray-800 uppercase truncate">
                {owner.owner_name || "Guest Walk-in"}
              </h3>
              {!isGuest && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-gray-500">
                    <HiMail size={12}/>
                    <span className="text-[10px] font-medium uppercase">{owner.owner_email || 'No Email'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <HiPhone size={12}/>
                    <span className="text-[10px] font-medium uppercase">{owner.owner_phone || 'No Phone'}</span>
                  </div>
                </div>
              )}
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mt-1.5">
                {!isGuest && (`Account ID: #${owner.user_id}`)}
              </p>
            </div>
          </div>

          <div className="pb-8">
            {step === 1 && !isGuest ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">History Log</h4>
                  <button 
                    onClick={() => handleDownloadPDF('all')}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 active:scale-98 transition-all cursor-pointer shadow-md"
                  >
                    <HiDownload size={14} /> Download Full Transaction
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div onClick={() => { setSelectedType('appointment'); setStep(2); }} className="flex flex-col items-center justify-center p-8 text-center transition-all bg-white border border-gray-400 rounded-2xl hover:border-(--clr-primary) hover:bg-green-50/50 cursor-pointer active:scale-98 min-h-[160px] group">
                    <div className="p-4 mb-3 rounded-full text-(--clr-primary) bg-green-100 group-hover:scale-105 transition-transform"><HiOutlineClipboardCheck size={28} /></div>
                    <p className="text-[11px] font-black uppercase leading-tight text-gray-800 tracking-widest">Appointment Billing</p>
                  </div>
                  
                  <div onClick={() => { setSelectedType('product'); setStep(2); }} className="flex flex-col items-center justify-center p-8 text-center transition-all bg-white border border-gray-400 rounded-2xl hover:border-purple-600 hover:bg-purple-50/50 cursor-pointer active:scale-98 min-h-[160px] group">
                    <div className="p-4 mb-3 rounded-full text-purple-600 bg-purple-100 group-hover:scale-105 transition-transform"><HiOutlineShoppingCart size={28} /></div>
                    <p className="text-[11px] font-black uppercase leading-tight text-gray-800 tracking-widest">Product Sales</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">
                    {selectedType === 'product' ? 'Product Transactions' : selectedType === 'appointment' ? 'Appointment Transactions' : 'History Log'}
                  </h4>
                  {!isGuest && (
                    <button 
                      onClick={() => handleDownloadPDF(selectedType)} 
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 active:scale-98 transition-all cursor-pointer"
                    >
                      <HiDownload size={14} /> Download Billing
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {displayedHistory.length > 0 ? displayedHistory.map((tx, i) => (
                    <div key={i} className="p-5 border border-gray-400 bg-white rounded-2xl cursor-default transition-all">
                      <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-100">
                        <div className="flex gap-2">
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                            {formatSafeDate(tx.display_date)}
                          </span>
                          <span className="text-[10px] font-black text-(--clr-primary) bg-blue-50 px-2 py-0.5 rounded uppercase">
                            Paid via {tx.payment_method || 'Cash'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-gray-800">TRANSAC ID: #{tx.order_id || tx.transaction_id}</span>
                      </div>

                      <div className="space-y-3">
                        {tx.items?.filter(item => {
                          if (selectedType === 'appointment') return true; 
                          if (selectedType === 'product') return item.product_id !== null;
                          return true;
                        }).map((item, idx) => {
                          const unitPrice = parseFloat(item.subtotal) / (parseInt(item.quantity) || 1);

                          return (
                            <div key={idx} className="flex justify-between items-start text-[11px] font-bold py-1">
                              <div className="flex flex-col flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded text-[9px] font-black shrink-0">
                                    {item.quantity}x
                                  </span>
                                  
                                  <div className="flex flex-col">
                                    <span className="text-gray-600 uppercase">
                                      {/* ADDED: Fallback string just in case data is entirely empty */}
                                      {item.display_name || item.item_name || item.product_name || item.service_name || "Unknown Item"}
                                    </span>
                                    <span className="text-[9px] text-gray-400 font-medium">
                                      @ ₱{unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })} each
                                    </span>
                                  </div>
                                </div>
                                
                                {(item.brand_name || item.brand_type || item.dosage) && (
                                  <div className="flex items-center gap-1.5 ml-7 mt-0.5">
                                    {item.brand_name && item.brand_name.toUpperCase() !== 'N/A' && (
                                      <span className="text-[8px] font-black text-gray-400 uppercase">
                                        {item.brand_name}
                                      </span>
                                    )}
                                    {item.brand_type && item.brand_type.toUpperCase() !== 'N/A' && (
                                      <>
                                        <span className="text-gray-300 text-[8px]">•</span>
                                        <span className="text-[8px] font-black text-gray-500 uppercase italic">
                                          {item.brand_type}
                                        </span>
                                      </>
                                    )}
                                    {item.dosage && item.dosage.toUpperCase() !== 'N/A' && (
                                      <>
                                        <span className="text-gray-300 text-[8px]">•</span>
                                        <span className="text-[8px] font-black text-blue-500 uppercase">
                                          {item.dosage}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>

                              <span className="text-gray-800 shrink-0">
                                ₱{parseFloat(item.subtotal).toLocaleString()}
                              </span>
                            </div>
                          );
                        })}

                        {selectedType === 'appointment' && (() => {
    // Calculate the total from the items array
    const calculatedTotal = tx.items?.reduce((acc, item) => acc + parseFloat(item.subtotal || 0), 0) || 0;
    const cashReceived = parseFloat(tx.cash_received || 0);
    const cashChange = parseFloat(tx.cash_change || 0);

    return (
      <div className="pt-3 mt-2 border-t border-dashed border-gray-200 space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-tight text-gray-800">
          <span>Total Amount</span>
          <span className="text-sm">
            ₱{calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-gray-500">
          <span>Cash Received</span>
          <span>
            ₱{cashReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-(--clr-primary)">
          <span>Cash Change</span>
          <span>
            ₱{cashChange.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    );
  })()}
                      </div>
                    </div>
                  )) : (
                    <div className="py-20 text-center border-2 border-gray-200 border-dashed rounded-2xl bg-white/50">
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                         No {selectedType === 'product' ? 'product' : 'appointment'} records found
                       </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between p-5 bg-white border-t border-gray-100 shrink-0">
          <p className="text-[9px] font-bold text-gray-600 uppercase">
            {isGuest ? 'Guest Transaction Overview' : `${owner.owner_name} Transaction Overview`}
          </p>
        </div>
      </div>
    </div>
  );
}