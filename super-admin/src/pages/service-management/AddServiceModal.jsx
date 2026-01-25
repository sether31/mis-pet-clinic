import { useState } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI';
// utils
import { authFetch } from '../../utils/authFetch';
// components
import Input from '../../components/Input'; 
// icons 
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function AddServiceModal({ initialData, branchId, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    branch_service_id: initialData?.branch_service_id || null,
    service_id: initialData?.service_id || 1, 
    name: initialData?.name || initialData?.master_name || '',
    description: initialData?.description || initialData?.description || '', 
    price: initialData?.price || '',
    duration: initialData?.duration || '',
    assigned_role: initialData?.assigned_role || 'veterinarian'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if(!value.toString().trim()) {
      setErrors(prev => ({ ...prev, [name]: "This field is required." }));
    } else {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description || !form.price || !form.duration) {
      toast.error("Please fill in all required fields.");
      return;
    }

    showLoader('Saving service details...');

    setIsSubmitting(true);
    const endpoint = initialData 
      ? '/api/super-admin/services/update-main-service.php' 
      : '/api/super-admin/services/create-main-service.php';

    try {
      const response = await authFetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ ...form, branch_id: branchId })
      });

      if(response.success) {
        toast.success(response.message);
        onRefresh();
        onClose();
      } else {
        toast.error(response.message);
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm font-sans">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white shadow-2xl rounded-2xl">
        
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {initialData ? 'Update Service' : 'Create Branch Service'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Manage branch service
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <Input
            value={form.name}
            label="Service Name"
            id="name"
            name="name"
            isImportant={true}
            placeholder="Premium grooming"
            onChange={handleChange}
            error={errors.name}
          />

          {/* description */}
          <div className="flex flex-col gap-1">
            <label className="ml-1 text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              rows="3"
              className="w-full p-3 text-sm border border-gray-200 rounded-xl outline-none bg-gray-50 focus:bg-white focus:border-black transition-all resize-none"
              placeholder="Provide details about this service..."
              value={form.description}
              onChange={handleChange}
            />
            {errors.description && errors.description  !== "valid" &&  (
              <span className="flex items-center gap-0.5 text-xs text-red-500">
                <HiMiniExclamationCircle size={16} />
                {errors.description}
              </span>
            )}
          </div>


          <div className="grid grid-cols-2 gap-4">
            <Input
              value={form.price}
              type="number"
              label="Price (₱)"
              id="price"
              name="price"
              isImportant={true}
              placeholder="0.00"
              onChange={handleChange}
              error={errors.price}
            />
            <Input
              value={form.duration}
              type="number"
              label="Duration (Mins)"
              id="duration"
              name="duration"
              isImportant={true}
              placeholder="e.g. 30"
              onChange={handleChange}
              error={errors.duration}
            />
          </div>

          <div className="space-y-1">
            <label className="ml-1 text-sm font-medium text-gray-700">Assigned Staff Role <span className="text-red-500">*</span></label>
            <select 
              name="assigned_role"
              className="w-full p-3 border border-gray-200 rounded-xl outline-none bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer"
              value={form.assigned_role}
              onChange={handleChange}
            >
              <option value="veterinarian">Veterinarian</option>
              <option value="groomer">Groomer</option>
              <option value="staff">Support Staff</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 mt-4 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) cursor-pointer rounded-xl hover:opacity-90 disabled:opacity-50 shadow-lg shadow-(--clr-primary)/20"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Saving..." : "Save Service Details"}
          </button>
        </form>
      </div>
    </div>
  );
}