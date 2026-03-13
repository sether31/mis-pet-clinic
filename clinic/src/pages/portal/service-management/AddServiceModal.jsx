import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useUI } from '../../../hooks/useUI';
import { authFetch } from '../../../utils/authFetch';
import Input from '../../../components/Input'; 
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiExclamationCircle, HiMiniExclamationCircle, HiOutlineSparkles } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function AddServiceModal({ initialData, branchId, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serviceTemplates, setServiceTemplates] = useState([]);

  const [form, setForm] = useState({
    branch_service_id: initialData?.branch_service_id || null,
    service_id: initialData?.service_id || '', 
    custom_name: initialData?.custom_name || '',
    custom_description: initialData?.custom_description || '', 
    price: initialData?.price || '',
    duration: initialData?.duration || '',
    assigned_role: initialData?.assigned_role || 'veterinarian'
  });

  // get service templates
  useEffect(() => {
    const fetchTemplates = async () => {
    if (!branchId || branchId === 'undefined') return;

    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/services/get-service-choices.php?branch_id=${branchId}`);
      if(res && res.success) {
        setServiceTemplates(res.data);
      } else {
        console.error("error", res?.message);
        toast.error("Failed to fetch service templates.")
      }
    } catch(err) {
      console.error("error:", err);
      toast.error("Failed to fetch service templates.")
    }
  };

    if (!initialData) fetchTemplates(); 
  }, [initialData, branchId]); 

  // handle template selection
  const handleTemplateChange = (e) => {
    const templateId = e.target.value;
    const selected = serviceTemplates.find(t => t.service_id == templateId);

    if(selected) {
      setForm(prev => ({
        ...prev,
        service_id: selected.service_id,
        custom_name: selected.name,
        custom_description: selected.description,
        price: selected.price,
        duration: selected.duration
      }));
    
      setErrors({});
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if(!value.toString().trim()) {
      const readableName = name.replace('_', ' ');
      const formattedName = readableName.charAt(0).toUpperCase() + readableName.slice(1);
      setErrors(prev => ({ ...prev, [name]: `${formattedName} is required.` }));
    } else {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!form.custom_name.trim()) newErrors.custom_name = "Service name is required.";
    if (!form.custom_description.trim()) newErrors.custom_description = "Description is required.";
    if (!form.price) newErrors.price = "Price is required.";
    if (!form.duration) newErrors.duration = "Duration is required.";

    if(Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    showLoader('Saving service details...');
    setIsSubmitting(true);
    const endpoint = initialData 
      ? '/api/clinic/general/services/update-branch-service.php' 
      : '/api/clinic/general/services/add-branch-service.php';

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
      console.error("error:", error?.message);
      toast.error("Something went wrong");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 font-sans text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-lg overflow-hidden bg-white rounded-2xl">
        
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

        <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* dropdown service */}
          {!initialData && (
            <div className="mb-2">
              <label className="mb-2 ml-1 text-xs font-bold tracking-wider text-gray-700 uppercase">
                Service Template
              </label>
              <select 
                className="w-full p-3 text-sm transition-all border border-gray-300 outline-none cursor-pointer rounded-xl hover:border-(--clr-black) focus-within:border-(--clr-primary)"
                onChange={handleTemplateChange}
                value={form.service_id}
              >
                <option value="">-- Select a standard service to pre-fill --</option>
                {serviceTemplates.map(t => (
                  <option className="capitalize" key={t.service_id} value={t.service_id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          <Input
            value={form.custom_name}
            label="Service Name"
            id="custom_name"
            name="custom_name"
            isImportant={true}
            placeholder="Premium grooming"
            onChange={handleChange}
            error={errors.custom_name}
          />

          <div className="flex flex-col gap-1">
            <label className="ml-1 text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="custom_description"
              rows="3"
              className={`w-full p-3 text-sm transition-all border border-gray-300 outline-none resize-none rounded-xl 
                ${errors.custom_description === 'valid' 
                  ? 'border-green-500' 
                  : errors.custom_description 
                  ? 'border-red-500'   
                  : 'border-gray-300 focus-within:border-(--clr-primary)' 
                }
              `}
              placeholder="Provide details about this service..."
              value={form.custom_description}
              onChange={handleChange}
            />
        
            {errors.custom_description && errors.custom_description !== 'valid' && (
              <p className="flex items-center gap-0.5 text-xs text-red-500">
                <HiMiniExclamationCircle size={16} />
                {errors.custom_description}
              </p>
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
              placeholder="500.00"
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
              placeholder="60"
              onChange={handleChange}
              error={errors.duration}
            />
          </div>

          <div className="space-y-1">
            <label className="ml-1 text-sm font-medium text-gray-700">Assigned Staff Role</label>
            <select 
              name="assigned_role"
              className="w-full p-3 transition-all border border-green-500 outline-none cursor-pointer rounded-xl"
              value={form.assigned_role}
              onChange={handleChange}
            >
              <option value="veterinarian">Veterinarian</option>
              <option value="groomer">Groomer</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 mt-4 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) cursor-pointer rounded-xl hover:opacity-90 disabled:opacity-50"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Saving..." : "Save Service Details"}
          </button>
        </form>
      </div>
    </div>
  );
}