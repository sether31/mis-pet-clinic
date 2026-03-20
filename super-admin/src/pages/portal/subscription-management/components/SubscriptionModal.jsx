import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../../utils/authFetch';
// icons
import { HiXCircle, HiSave, HiExclamationCircle } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function SubscriptionModal({ initialData, onClose, onRefresh }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({}); 

  const [form, setForm] = useState({
    subscription_id: initialData?.subscription_id,
    name: initialData?.name || '',
    price: initialData?.price || '',
    duration_months: initialData?.duration_months || 1,
    appointment_limit: initialData?.appointment_limit || 100,
    has_shop: initialData ? Boolean(Number(initialData.has_shop)) : false,
    has_email: 1,
    has_medical_records: 1,
    is_active: initialData ? Number(initialData.is_active) : 1
  });

  // validation 
  const validate = () => {
    let tempErrors = {};
    if (!form.name.trim()) tempErrors.name = "Subscription name is required";
    if (!form.price || form.price < 0) tempErrors.price = "Price is required";
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check validation
    if (!validate()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    const isUpdating = Boolean(form.subscription_id);
    const endpoint = isUpdating ? 'update-subscription.php' : 'create-subscription.php';

    const payload = {
      subscription_id: form.subscription_id,
      name: form.name,
      price: parseFloat(form.price), 
      duration_months: parseInt(form.duration_months), 
      appointment_limit: parseInt(form.appointment_limit), 
      has_shop: form.has_shop ? 1 : 0,
      has_unlimited_email: 1,
      is_active: form.is_active
    };

    try {
      const response = await authFetch(`${API_URL}/api/super-admin/subscription/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if(response.success) {
        toast.success(response.message || "Saved successfully");
        onRefresh();
        onClose();
      } else {
        toast.error(response.message || "Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {form.subscription_id ? 'Edit Subscription' : 'Create Subscription'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">manage subscription details and limits</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* name */}
          <div className="space-y-1">
            <label className="text-[10px] ml-1 mb-1 font-black uppercase text-gray-500 tracking-widest">Subscription Name <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className={`w-full p-3 text-sm font-bold border outline-none bg-gray-50 rounded-xl transition-all ${errors.name ? 'border-red-500' : 'border-gray-300 focus:border-(--clr-primary)'}`}
              placeholder="Enter subscription name"
              value={form.name}
              onChange={(e) => {
                setForm({...form, name: e.target.value});
                if(errors.name) setErrors({...errors, name: null});
              }}
            />
            {errors.name && <p className="text-xs text-red-500 flex gap-0.5 items-center"><HiExclamationCircle /> {errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* price */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Price <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                className={`w-full p-3 text-sm border outline-none bg-gray-50 rounded-xl transition-all ${errors.price ? 'border-red-500' : 'border-gray-300 focus:border-(--clr-primary)'}`}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => {
                    setForm({...form, price: e.target.value});
                    if(errors.price) setErrors({...errors, price: null});
                }}
              />
              {errors.price && <p className="text-xs text-red-500 flex gap-0.5 items-center"><HiExclamationCircle /> {errors.price}</p>}
            </div>
                
            {/* duration */}
            <div className="space-y-1">
              <label className="text-[10px] ml-1 mb-1 font-black uppercase text-gray-500 tracking-widest">Duration <span className="text-red-500">*</span></label>
              <select 
                className="w-full p-3 text-sm font-bold border border-gray-300 outline-none bg-gray-50 rounded-xl"
                value={form.duration_months}
                onChange={(e) => setForm({...form, duration_months: e.target.value})}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} {i === 0 ? 'Month' : 'Months'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* appointment limit */}
          <div className="space-y-1">
            <label className="text-[10px] ml-1 mb-1 font-black uppercase text-gray-500 tracking-widest">Appointment Limit <span className="text-red-500">*</span></label>
            <select 
              className="w-full p-3 text-sm font-bold border border-gray-300 outline-none bg-gray-50 rounded-xl"
              value={form.appointment_limit}
              onChange={(e) => setForm({...form, appointment_limit: e.target.value})}
            >
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(val => (
                <option key={val} value={val}>{val} Appointments</option>
              ))}
              <option value="1001">Unlimited Appointments</option>
            </select>
          </div>

          {/* features */}
          <div className="pt-4 grid gap-4">
            <label className="text-[10px] ml-1 mb-1 font-black uppercase text-gray-500 tracking-widest block">Standard & Additional Features</label>

            {/* email */}
            <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 select-none rounded-xl opacity-80">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase">Email Support</span>
                  <span className="bg-gray-200 text-[8px] px-2 py-0.5 rounded-full font-black text-gray-500 uppercase">System Default</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Included in all plans</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={true} 
                  disabled={true} 
                />
                <div className="w-11 h-6 bg-(--clr-primary)/40 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/90 after:rounded-full after:h-5 after:w-5 after:translate-x-full after:transition-all"></div>
              </label>
            </div>

            {/* medical record */}
            <div className="flex items-center justify-between p-4 bg-gray-100 border border-gray-200 select-none rounded-xl opacity-80">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="block text-xs font-bold text-gray-400 uppercase">Medical Record</span>
                  <span className="bg-gray-200 text-[8px] px-2 py-0.5 rounded-full font-black text-gray-500 uppercase">System default</span>
                </div>
                <p className="text-[9px] text-gray-400 font-bold uppercase italic tracking-tighter">
                  Vets can upload X-rays & notes for Mobile App users
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input type="checkbox" className="sr-only peer" checked={true} disabled={true} />
                <div className="w-11 h-6 bg-(--clr-primary)/40 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/90 after:rounded-full after:h-5 after:w-5 after:translate-x-full after:transition-all"></div>
              </label>
            </div>

            {/* inventory and shop*/}
            <div className="flex items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-xl">
              <div>
                <span className="block text-xs font-bold text-gray-700 uppercase">Shop Reservation & Inventory</span>
                <p className="text-[9px] text-gray-400 font-bold uppercase italic italic tracking-tighter">Activates product catalog, inventory tracking, and client reservations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={form.has_shop} onChange={(e) => setForm({...form, has_shop: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-(--clr-primary)"></div>
              </label>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) rounded-xl hover:brightness-110 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Processing..." : "Save Subscription Plan"}
          </button>
        </form>
      </div>
    </div>
  );
}