import { useEffect, useState } from 'react'
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../hooks/useUI';
import { usePlatform } from '../hooks/usePlatform';
// utils
import wait from '../utils/wait';
import { authFetch } from '../utils/authFetch';
// components
import Input from './Input';
import InputImage from './InputImage';
import Button from './Button';
// icons
import { HiMiniExclamationCircle, HiOutlineBuildingOffice2, HiXCircle } from "react-icons/hi2";
import { CiCreditCard1 } from "react-icons/ci";
import { LiaBusinessTimeSolid } from "react-icons/lia";


const API_URL = import.meta.env.VITE_API_URL;

const initialFormState = {
  clinicName: '',
  completeAddress: '',
  municipality: '',
  province: '',
  zipCode: '',
  est: '',
  clinicDescription: '',
  website: '',
  facebook: '',
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
  tinNumber: '',
  businessPermitNumber: '',
  vetLicenseNumber: '',
  clinicStartTime: '',
  clinicEndTime: '',
  services: [],
  agreeTerms: false,
  tinNumberPic: null,
  businessPermitPic: null,
  vetLicensePic: null
}

export default function AddBranchModal({ isOpen, onClose, onSuccess }) {
  const { platformData } = usePlatform();
  const { showLoader, hideLoader } = useUI();
  const [form, setForm] = useState(initialFormState);
  const [dbServices, setDbServices] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchMasterServices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public-data/get-services.php`);
        const data = await res.json();
        if(data.success) {
          setDbServices(data.data);
        }
      } catch(err) {
        console.error("Failed to fetch services", err);
      }
    };
    fetchMasterServices();
  }, []);

  const inputLabels = {
    clinicName: "Clinic Name",
    completeAddress: "Complete Address",
    municipality: "City/Municipality",
    province: "Province",
    zipCode: "Zip Code",
    est: "Year Established",
    clinicDescription: "Clinic Description",
    website: "Website",
    facebook: "Facebook",
    tinNumber: "Tin Number",
    businessPermitNumber: "Business Permit Number",
    vetLicenseNumber: "Veterinarian License Number",
    clinicStartTime: "Clinic Start Time",
    clinicEndTime: "Clinic End Time",
    services: "Services",
    agreeTerms: "Terms & Conditions",
    tinNumberPic: "Tin Picture",
    businessPermitPic: "Business Permit Picture",
    vetLicensePic: "Veterinarian License Picture"
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value
    }));

    // check image
    if(type === "file") {
      setErrors(prev => ({
        ...prev,
        [name]: files[0] ? "valid" : `${inputLabels[name]} is required.`
      }));
      return;
    }

    // check service
    if(name === "services") {
      const serviceId = Number(value); 
      const selected = [...form.services];
      const index = selected.indexOf(serviceId);

      if(index === -1) {
        selected.push(serviceId); 
      } else {
        selected.splice(index, 1); 
      }
      setForm(prev => ({ ...prev, services: selected }));
      setErrors(prev => ({
        ...prev,
        services: selected.length === 0 ? "Select at least one service." : "valid"
      }));
      return;
    }

    // check time
    if(name === "clinicStartTime") {
      setErrors(prev => ({
        ...prev,
        clinicStartTime: value ? "valid" : "",
        clinicEndTime:
          form.clinicEndTime || !value
            ? "valid"
            : "End time is required if start time is set."
      }));
      return;
    }

    if(name === "clinicEndTime") {
      setErrors(prev => ({
        ...prev,
        clinicEndTime: value ? "valid" : "",
        clinicStartTime:
          form.clinicStartTime || !value
            ? "valid"
            : "Start time is required if end time is set."
      }));
      return;
    }

    // check checkbox
    if(type === "checkbox" && name === "agreeTerms") {
      setErrors(prev => ({
        ...prev,
        agreeTerms: checked ? "" : `${inputLabels[name]} is required.`
      }));
      return;
    }

    // check other inputs 
    if(!value.trim()) {
      setErrors(prev => ({
        ...prev,
        [name]: `${inputLabels[name]} is required.`
      }));
    } else {
      setErrors(prev => ({
        ...prev,
        [name]: "valid"
      }));
    }
  };


  const validateForm = () => {
    const newErrors = {};
    const requiredInputFields = [
      "clinicName",
      "completeAddress",
      "municipality",
      "province",
      "zipCode",
      "est",
      "clinicDescription",
      "tinNumber",
      "businessPermitNumber",
      "vetLicenseNumber",
      "agreeTerms"
    ];

    requiredInputFields.forEach(field => {
      if(!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });
  
    // check image
    ["tinNumberPic", "businessPermitPic", "vetLicensePic"].forEach(field => {
      if(!form[field]) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    // check service
    if(form.services.length === 0) {
      newErrors.services = "Select at least one service.";
    }

    // check time
    if(form.clinicStartTime && !form.clinicEndTime) {
      newErrors.clinicEndTime = "End time is required if start time is set.";
    }

    if(form.clinicEndTime && !form.clinicStartTime) {
      newErrors.clinicStartTime = "Start time is required if end time is set.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if(Object.keys(validationErrors).length > 0) {
      await wait(1000);
      toast.error("Please fill in all required fields correctly.");
      hideLoader();
      return;  
    }

    await wait(1000);
    // append to form data
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if(form[key] !== null) {
          if(key === 'services') {
          formData.append(key, JSON.stringify(form[key]));
        } else {
          formData.append(key, form[key]);
        }
      }
    });

    try {
      const res = await authFetch(`${API_URL}/api/clinic/clinic-admin/branches/add-new-branch.php`, {
        method: "POST",
        body: formData
      });

      if(!res.success) {
        toast.error("Something went wrong")
        hideLoader();
        return;
      }
      toast.success(res.message || "Registration completed. Please wait for admin approval.");
      onSuccess();
    } catch(error) {
      toast.error("Something went wrong");
    }
    hideLoader();
  };



  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: "100%" }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: 0 }}
        className='fixed inset-0 z-100 bg-white overflow-y-scroll'
      >
        {/* nav */}
        <div className='container-xl flex items-center justify-between gap-4 my-5'>
          <div className="flex gap-2 items-center">
            {platformData?.platform_logo && (
              <img 
                src={`${API_URL}/${platformData.platform_logo}`} 
                alt="Logo" 
                className="h-6 w-auto object-contain rounded-sm"
                onError={(e) => (e.target.style.display = 'none')} 
              />
            )}
            
            <h1 className="text-2xl font-bold text-(--clr-text-header) tracking-tight">
              {platformData?.platform_name || "LOGO"}
            </h1>
          </div>

          <button onClick={onClose}  className="text-gray-400 cursor-pointer hover:text-red-500">
            <HiXCircle size={32} />
          </button>
        </div>
        {/* main content */}
        <div className='container-xl pb-10'>   
          <h1 className='mb-4 text-3xl sm:text-4xl font-bold text-(--clr-text-header)'>Register New Branch</h1>
          <p className='mb-12 text-base'> 
            Fill out the details to add a new location to your clinic network.
          </p>
          {/* registration */}
          <form onSubmit={handleSubmit}>
            <section className='grid gap-4'>
              {/* clinic information */}
              <div className='pb-8 mb-5 border-b border-gray-300'>
                <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
                  <HiOutlineBuildingOffice2 className='text-(--clr-text-header)' />
                  <span>Clinic Information</span>
                </h1>
                
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                  <Input
                    value={form.clinicName}
                    label="Clinic Name"
                    labelStyle="mb-1 ml-1"
                    id="clinicName"
                    name="clinicName"
                    isImportant={true}
                    placeholder="Enter your clinic name"
                    onChange={handleChange}
                    error={errors.clinicName}
                  />

                  <Input
                    value={form.completeAddress}
                    label="Complete Address"
                    labelStyle="mb-1 ml-1"
                    id="completeAddress"
                    name="completeAddress"
                    isImportant={true}
                    placeholder="Street, Barangay, Building No., etc."
                    onChange={handleChange}
                    error={errors.completeAddress}
                  />

                  <Input
                    value={form.municipality}
                    label="City/Municipality"
                    labelStyle="mb-1 ml-1"
                    id="municipality"
                    name="municipality"
                    isImportant={true}
                    placeholder="Binangonan"
                    onChange={handleChange}
                    error={errors.municipality}
                  />

                  <Input
                    value={form.province}
                    label="Province"
                    labelStyle="mb-1 ml-1"
                    id="province"
                    name="province"
                    isImportant={true}
                    placeholder="Rizal"
                    onChange={handleChange}
                    error={errors.province}
                  />

                  
                  <Input
                    value={form.zipCode}
                    label="Zip Code"
                    labelStyle="mb-1 ml-1"
                    id="zipCode"
                    name="zipCode"
                    isImportant={true}
                    placeholder="Rizal"
                    onChange={handleChange}
                    error={errors.zipCode}
                  />

                  <Input
                    value={form.est}
                    label="Year Establish"
                    labelStyle="mb-1 ml-1"
                    id="est"
                    name="est"
                    isImportant={true}
                    placeholder="2025"
                    onChange={handleChange}
                    error={errors.est}
                  />

                  <div className='mb-4'>
                    <label htmlFor='clinicDescription' className='ml-1 text-sm font-medium text-gray-700'>
                      Clinic Description {' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.clinicDescription} 
                      id="clinicDescription"
                      name="clinicDescription"
                      className={`border border-gray-300 outline-none rounded-lg p-2 w-full min-h-[115px] mt-2 
                        ${errors.clinicDescription === "valid" ? "border-green-500" : "border-gray-300"}
                        ${errors.clinicDescription === "Clinic Description is required." ? "border-red-500" : "border-gray-300"}
                      `}
                      placeholder="Brief description of your clinic, specialization, and what makes you unique..."
                      onChange={handleChange} 
                    ></textarea>
                    {(errors.clinicDescription && errors.clinicDescription !== "valid") && (
                      <p className="flex items-center text-xs text-red-500">
                        <HiMiniExclamationCircle size={16} />
                        {errors.clinicDescription}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      value={form.website}
                      label="Website"
                      labelStyle="mb-1 ml-1"
                      id="website"
                      name="website"
                      isOptional={true}
                      placeholder="https://www.clinic.com"
                      onChange={handleChange}
                      error={errors.website}
                    />

                    <Input
                      value={form.facebook}
                      label="Facebook"
                      labelStyle="mb-1 ml-1"
                      id="facebook"
                      name="facebook"
                      isOptional={true}
                      placeholder="https://facebook.com/"
                      onChange={handleChange}
                      error={errors.facebook}
                    />
                  </div>
                </div>
              </div>

              {/* business & licensing information */}
              <div className='pb-8 mb-5 border-b border-gray-300'>
                <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
                  <CiCreditCard1 className='text-(--clr-text-header)' />
                  <span>Business & licensing Information</span>
                </h1>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                  <InputImage
                    label="Tin Number Picture"
                    name="tinNumberPic"
                    required={true}
                    onChange={handleChange}
                    error={errors.tinNumberPic}
                  />

                  <Input
                    value={form.tinNumber}
                    label="Tin Number"
                    labelStyle="mb-1 ml-1"
                    id="tinNumber"
                    isImportant={true}
                    name="tinNumber"
                    placeholder="123-456-789-000"
                    onChange={handleChange}
                    error={errors.tinNumber}
                  />

                  <InputImage
                    label="Business Permit Picture"
                    name="businessPermitPic"
                    required={true}
                    onChange={handleChange}
                    error={errors.businessPermitPic}
                  />

                  <Input
                    value={form.businessPermitNumber}
                    label="Business Permit Number"
                    labelStyle="mb-1 ml-1"
                    id="businessPermitNumber"
                    isImportant={true}
                    name="businessPermitNumber"
                    placeholder="BP-2025-12345"
                    onChange={handleChange}
                    error={errors.businessPermitNumber}
                  />

                  <InputImage
                    label="Veterinarian License Picture"
                    name="vetLicensePic"
                    required={true}
                    onChange={handleChange}
                    error={errors.vetLicensePic}
                  />

                  <Input
                    value={form.vetLicenseNumber}
                    label="Veterinarian License Number"
                    labelStyle="mb-1 ml-1"
                    id="vetLicenseNumber"
                    isImportant={true}
                    name="vetLicenseNumber"
                    placeholder="12345"
                    onChange={handleChange}
                    error={errors.vetLicenseNumber}
                  />
                </div>
              </div>
                
              {/* services and operations */}
              <div className='pb-8 mb-5 border-b border-gray-300'>
                <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
                  <LiaBusinessTimeSolid className='text-(--clr-text-header)' />
                  <span>Services and Operations</span>
                </h1>
                <div className='grid grid-cols-1 gap-4'>
                  <div className='flex gap-4'>
                    <Input
                      value={form.clinicStartTime} 
                      type='time'
                      label="Operating hours start time"
                      labelStyle="mb-1 ml-1"
                      id="clinicStartTime"
                      isOptional={true}
                      name="clinicStartTime"
                      placeholder="6:00 AM"
                      onChange={handleChange}
                      error={errors.clinicStartTime}
                    />
                    <Input
                      value={form.clinicEndTime} 
                      type='time'
                      label="Operating hours end time"
                      labelStyle="mb-1 ml-1"
                      id="clinicEndTime"
                      isOptional={true}
                      name="clinicEndTime"
                      placeholder="10:00 PM"
                      onChange={handleChange}
                      error={errors.clinicEndTime}
                    />
                  </div>
      
                  {/* services */}
                  <div className="relative">
                    <h1 className='mb-2 ml-1 text-sm font-medium text-gray-700'>
                      Services Offered <span className="text-red-500">*</span>
                    </h1>

                    {/* custom select box */}
                    <div 
                      className={`min-h-[45px] p-2 border rounded-lg cursor-pointer flex flex-wrap gap-2 bg-white transition-all ${
                        errors.services === "valid" ? "border-green-500" : "border-gray-300 focus-within:border-(--clr-black)"
                      }`}
                      onClick={() => {
                        const el = document.getElementById('services-list');
                        el.classList.toggle('hidden');
                      }}
                    >
                      {form.services.length === 0 && (
                        <span className="py-1 ml-2 text-gray-400">Select services...</span>
                      )}
                      
                      {form.services.map(selectedId => {
                        const serviceDetail = dbServices.find(s => s.service_id == selectedId);
                        return (
                          <span 
                            key={selectedId} 
                            className="px-3 py-1 bg-(--clr-primary) text-white text-[11px] font-bold rounded-full flex items-center gap-2"
                          >
                            {serviceDetail ? serviceDetail.name : "Loading..."}
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange({ target: { name: 'services', value: selectedId } });
                              }}
                              className="hover:text-red-200"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    {/* dropdown */}
                    <div 
                      id="services-list" 
                      className="absolute z-10 hidden w-full mt-1 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-xl max-h-60"
                      onMouseLeave={() => document.getElementById('services-list').classList.add('hidden')}
                    >
                      {dbServices.length > 0 ? (
                        dbServices.map(service => (
                          <div
                            key={service.service_id}
                            onClick={() => handleChange({ target: { name: 'services', value: service.service_id } })}
                            className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 flex justify-between items-center ${
                              form.services.includes(service.service_id) ? "bg-gray-50 font-bold text-(--clr-primary)" : "text-gray-700"
                            }`}
                          >
                            <div>
                              <p className="font-medium">{service.name}</p>
                              {service.description && (
                                <p className="text-[10px] text-gray-400 line-clamp-1">{service.description}</p>
                              )}
                            </div>
                            {form.services.includes(service.service_id) && (
                              <span className="text-(--clr-primary) font-bold">✓</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm italic text-gray-500">No services found.</div>
                      )}
                    </div>

                    {/* error message */}
                    {errors.services && errors.services !== "valid" && (
                      <p className="flex items-center mt-1 text-xs text-red-500">
                        <HiMiniExclamationCircle size={16} />
                        {errors.services}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className='p-4 bg-gray-200 rounded-md'>
                <h1 className='mb-1 font-medium text-md'>TERMS & CONDITION</h1>
                <div className='flex items-center gap-1'>
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={form.agreeTerms}
                    onChange={handleChange}
                    className='accent-(--clr-primary)'
                  />
                  <label htmlFor="emergency-service">I agree to terms and conditions</label>
                </div>
                {errors.agreeTerms && (
                  <p className="flex items-center mt-1 text-sm text-red-500">{errors.agreeTerms}</p>
                )}
                <p>By registering, you confirm that all information provided is accurate and that you agree to the platform’s rules, verification process, privacy policy, and acceptable use guidelines.</p>
              </div>
            </section>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full lg:w-[200px] mx-auto mt-4 cursor-pointer"
            >
              Register
            </Button>
          </form>
        </div>
      </motion.div>   
    </>
  )
}
