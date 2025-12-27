import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../utils/authFetch';
// icons
import { HiXCircle, HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function SubscriptionModal({ initialData, onClose, onRefresh }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // initialize data
  const [form, setForm] = useState({
    subscription_id: initialData?.subscription_id,
    name: initialData?.name || '',
    price: initialData?.price || '',
    duration_months: initialData?.duration_months || 1,
    appointment_limit: initialData?.appointment_limit || 100,
    has_marketplace: initialData ? Boolean(Number(initialData.has_marketplace)) : false,
    has_unlimited_email: initialData ? Boolean(Number(initialData.has_unlimited_email)) : false,
    is_active: initialData ? Number(initialData.is_active) : 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // check what endpoint if have id
    const isUpdating = Boolean(form.subscription_id);
    const endpoint = isUpdating ? 'update-subscription.php' : 'create-subscription.php';

    const payload = {
      name: form.name,
      price: parseFloat(form.price), 
      duration_months: parseInt(form.duration_months), 
      appointment_limit: parseInt(form.appointment_limit), 
      has_marketplace: form.has_marketplace ? 1 : 0,
      has_unlimited_email: form.has_unlimited_email ? 1 : 0,
      is_active: form.is_active
    };

    if(isUpdating) {
      payload.subscription_id = form.subscription_id;
    }

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
        toast.error("Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white shadow-2xl rounded-2xl">
        {/* modal header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {form.subscription_id ? 'Edit Subscription' : 'Create Subscription'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configure subscription details and limits</p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500" disabled={isSubmitting}>
            <HiXCircle size={32}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* subscription name */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Subscription Name</label>
            <input 
              type="text" 
              className="w-full p-3 text-sm font-bold transition-all border border-gray-300 outline-none bg-gray-50 rounded-xl focus:border-(--clr-primary)"
              placeholder="e.g., Premium Tier"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-(--clr-text-primary)">
            {/* price */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Price (PHP)</label>
              <input 
                type="number" 
                className="w-full p-3 text-sm font-bold transition-all border border-gray-300 outline-none bg-gray-50 rounded-xl focus:border-(--clr-primary)"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({...form, price: e.target.value})}
                required
              />
            </div>

            {/* duration list */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Duration</label>
              <select 
                className="w-full p-3 text-sm font-bold transition-all border border-gray-300 outline-none cursor-pointer bg-gray-50 rounded-xl focus:border-(--clr-primary)"
                value={form.duration_months}
                onChange={(e) => setForm({...form, duration_months: e.target.value})}
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} {i === 0 ? 'Month' : 'Months'}</option>
                ))}
              </select>
            </div>
          </div>

          {/* appointment list */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Appointment Limit</label>
            <select 
              className="w-full p-3 text-sm font-bold transition-all border border-gray-300 outline-none cursor-pointer bg-gray-50 rounded-xl focus:border-(--clr-primary)"
              value={form.appointment_limit}
              onChange={(e) => setForm({...form, appointment_limit: e.target.value})}
            >
              {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map(val => (
                <option key={val} value={val}>{val} Appointments</option>
              ))}
              <option value="1001">Unlimited Appointments</option>
            </select>
          </div>

          {/* features */}
          <div className="pt-4 space-y-3">
            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest block mb-2">Additional Features</label>
            
            <label className="flex items-center justify-between p-4 transition-all border border-gray-200 cursor-pointer bg-gray-50 rounded-xl hover:bg-(--clr-bg-page)">
              <span className="text-xs font-bold text-gray-700 uppercase">Include Marketplace Access</span>
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-(--clr-primary)"
                checked={form.has_marketplace}
                onChange={(e) => setForm({...form, has_marketplace: e.target.checked})}
              />
            </label>

            <label className="flex items-center justify-between p-4 transition-all border border-gray-200 cursor-pointer bg-gray-50 rounded-xl hover:bg-(--clr-bg-page)">
              <span className="text-xs font-bold text-gray-700 uppercase">Unlimited Email Support</span>
              <input 
                type="checkbox" 
                className="w-5 h-5 accent-(--clr-primary)"
                checked={form.has_unlimited_email}
                onChange={(e) => setForm({...form, has_unlimited_email: e.target.checked})}
              />
            </label>
          </div>

          {/* action btn */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-(--clr-text-secondary) uppercase transition-all bg-(--clr-primary) shadow-lg rounded-xl hover:bg-(--clr-primary)/95 disabled:opacity-50 cursor-pointer"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Processing..." : "Save Subscription Plan"}
          </button>
        </form>
      </div>
    </div>
  );
}