import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify'; 
// hooks
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
import { validateEmail } from '../../../../utils/validateEmail';
// components
import Input from '../../../../components/Input';
import InputImage from '../../../../components/InputImage';
// icons
import { RiGlobalLine, RiDatabase2Line, RiMailLine, RiPhoneLine } from 'react-icons/ri';
import { HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function GeneralSettings() {
  const { showLoader, hideLoader } = useUI();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    platform_name: '',
    support_email: '',
    contact_phone: '',
    logo: null,
    currentLogoUrl: null
  });

  const inputLabels = {
    platform_name: "Platform Name",
    support_email: "Support Email",
    contact_phone: "Contact Phone"
  };

  useEffect(() => {
    const fetchSettings = async () => {
      showLoader();
      try {
        const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/get-general-settings.php`);
        if (res?.success && res.data) {
          setFormData({
            platform_name: res.data.platform_name || '',
            support_email: res.data.platform_email || '',
            contact_phone: res.data.contact_phone || '',
            logo: null,
            currentLogoUrl: res.data.platform_logo ? res.data.platform_logo : null
          });
          setMaintenanceMode(res.data.is_maintenance === 1);
        }
      } catch(err) {
        toast.error("Failed to load platform settings");
      } finally {
        hideLoader();
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? files[0] : value
    }));

    if(type === "file") {
      setErrors(prev => ({ ...prev, [name]: files[0] ? "valid" : "" }));
      return;
    }

    if(name === "support_email") {
      if(!value.trim()) setErrors(prev => ({ ...prev, support_email: `${inputLabels[name]} is required.` }));
      else if(!validateEmail(value)) setErrors(prev => ({ ...prev, support_email: "Invalid email format." }));
      else setErrors(prev => ({ ...prev, support_email: "valid" }));
      return;
    }

    if(!value.trim()) setErrors(prev => ({ ...prev, [name]: `${inputLabels[name]} is required.` }));
    else setErrors(prev => ({ ...prev, [name]: "valid" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if(!formData.platform_name.trim()) newErrors.platform_name = "Platform Name is required.";
    if(!formData.support_email.trim()) newErrors.support_email = "Support Email is required.";
    else if(!validateEmail(formData.support_email)) newErrors.support_email = "Invalid email format.";
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if(Object.keys(validationErrors).length > 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    showLoader();
    try {
      const data = new FormData();
      data.append('platform_name', formData.platform_name);
      data.append('platform_email', formData.support_email);
      data.append('contact_phone', formData.contact_phone);
      data.append('is_maintenance', maintenanceMode ? 1 : 0);
      
      if(formData.logo) data.append('platform_logo', formData.logo);

      const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/update-general-settings.php`, {
        method: 'POST',
        body: data 
      });

      if(res?.success) {
        toast.success(res.message || "Settings updated!");
        setErrors({});
      } else {
        toast.error("Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    }
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="space-y-10">       
          {/* platform info */}
          <div className="space-y-6">
            <div className="flex items-center gap-1 pb-2 text-lg font-bold text-gray-900 border-b border-gray-100">
              <RiGlobalLine size={24} className="text-gray-700" />
              Platform Information
            </div>

            <div className="space-y-6">
              <InputImage 
                label="Platform Logo"
                name="logo"
                required={false}
                isPreview={true}
                existingImage={formData.currentLogoUrl}
                size="120px" 
                onChange={handleChange}
                error={errors.logo}
              />

              <div className="space-y-4">
                <Input 
                  label="Platform Name"
                  name="platform_name"
                  isImportant={true}
                  value={formData.platform_name}
                  onChange={handleChange}
                  error={errors.platform_name}
                  placeholder="Enter platform name"
                  icon={<RiGlobalLine size={18} className="text-gray-400" />}
                />
                <Input 
                  label="Support Email"
                  name="support_email"
                  isImportant={true}
                  type="email"
                  value={formData.support_email}
                  onChange={handleChange}
                  error={errors.support_email}
                  placeholder="e.g. support@platform.com"
                  icon={<RiMailLine size={18} className="text-gray-400" />}
                />
                <Input 
                  label="Contact Phone"
                  name="contact_phone"
                  isImportant={true}
                  value={formData.contact_phone}
                  onChange={handleChange}
                  error={errors.contact_phone}
                  placeholder="e.g. +63 912 345 6789"
                  icon={<RiPhoneLine size={18} className="text-gray-400" />}
                />
              </div>
            </div>
          </div>

          {/* operations */}
          <div className="pt-8 space-y-6 border-t border-gray-100">
            <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
              <RiDatabase2Line size={24} className="text-gray-700" />
              Platform Operations
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900">Maintenance Mode</h4>
                <p className="text-sm text-gray-500 italic">Temporarily disable platform access</p>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={maintenanceMode}
                  onChange={() => setMaintenanceMode(!maintenanceMode)}
                />
                <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-start pt-4">
            <button 
              onClick={handleSubmit}
              className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg cursor-pointer bg-(--clr-primary) hover:opacity-90 transition-all active:scale-95 w-full sm:w-auto"
            >
              <HiSave size={18} />
              Save General Settings
            </button>
          </div>
        </div>

        <div className="hidden lg:block"></div></div>
    </div>
  );
}