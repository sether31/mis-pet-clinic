import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'; 
import { toast } from 'react-toastify';
import { useUI } from '../../../hooks/useUI';
import { useUser } from '../../../hooks/useUser'; 
import { authFetch } from '../../../utils/authFetch'
import Input from '../../../components/Input';
import InputImage from '../../../components/InputImage';
import LoaderV2 from '../../../components/LoaderV2';
import { HiMiniExclamationCircle, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { CiCreditCard1, CiImageOn } from "react-icons/ci";
import { HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

const initialFormState = {
  brandLogo: null,
  logoPic: null, 
  mainBrandingName: '',
  clinicName: '',
  contactNumber: '',
  completeAddress: '',
  municipality: '',
  province: '',
  zipCode: '',
  est: '',
  clinicDescription: '',
  website: '',
  facebook: '',
  tinNumber: '',
  businessPermitNumber: '',
  tinNumberPic: null,
  businessPermitPic: null
}

export default function GeneralBranchSettings() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const { user } = useUser(); 
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState(initialFormState);
  const [existingPaths, setExistingPaths] = useState({
    logoPic: '',
    tinNumberPic: '',
    businessPermitPic: ''
    // Removed Vet License Path
  });
  const [errors, setErrors] = useState({});

  const isBranchAdmin = user?.role === 'branch_admin';
  const isClinicAdmin = user?.role === 'clinic_admin';

  const inputLabels = {
    brandLogo: 'Main Brand Logo',
    logoPic: "Clinic Logo",
    mainBrandingName: "Main Branding Name",
    clinicName: "Clinic Name",
    contactNumber: "Contact Number", 
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
    tinNumberPic: "Tin Picture",
    businessPermitPic: "Business Permit Picture"
  };

  const fetchClinicData = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/general-setting/get-general-branch-settings.php`, {
        method: 'POST',
        body: JSON.stringify({ branch_id: branchId }) 
      });
      
      if(res.success && res.data) {
        setForm(prev => ({
          ...prev,
          mainBrandingName: res.data.main_branding_name || '',
          clinicName: res.data.name || '',
          contactNumber: res.data.contact_number || '',
          completeAddress: res.data.address || '',
          municipality: res.data.municipality || '',
          province: res.data.province || '',
          zipCode: res.data.zip_code || '',
          est: res.data.est || '',
          clinicDescription: res.data.description || '',
          website: res.data.website || '',
          facebook: res.data.facebook || '',         
          tinNumber: res.data.tin_id_number || '',
          businessPermitNumber: res.data.business_permit_number || ''
        }));

        setExistingPaths({
          brandLogo: res.data.brand_logo || '',
          logoPic: res.data.logo_picture || '', 
          tinNumberPic: res.data.tin_id_picture || '',
          businessPermitPic: res.data.business_permit_picture || ''
        });
      }
    } catch(err) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicData();
  }, [branchId]); 

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "file" ? files[0] : value
    }));

    if(type === "file") {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
      return;
    }

    if(!value.toString().trim()) {
      setErrors(prev => ({ ...prev, [name]: `${inputLabels[name]} is required.` }));
    } else {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const requiredInputFields = [
      "clinicName", "contactNumber", "completeAddress", "municipality", "province",
      "zipCode", "est", "clinicDescription"
    ];
    const requiredImages = ["logoPic", "brandLogo"];

    if (isClinicAdmin) {
      requiredInputFields.push("mainBrandingName");
    }

    if (!isBranchAdmin) {
      requiredInputFields.push("tinNumber", "businessPermitNumber");
      requiredImages.push("tinNumberPic", "businessPermitPic");
    }

    requiredInputFields.forEach(field => {
      if(!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    requiredImages.forEach(field => {
      if(!form[field] && !existingPaths[field]) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();

    const validationErrors = validateForm();
    setErrors(validationErrors);
    
    if(Object.keys(validationErrors).length > 0) {
      toast.error("Please fill in all required fields.");
      hideLoader();
      return;   
    }

    const formData = new FormData();
    formData.append('branch_id', branchId);
    Object.keys(form).forEach(key => {
      if (form[key] !== null) {
        formData.append(key, form[key]);
      }
    });

    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/general-setting/update-general-branch-settings.php`, {
        method: "POST",
        body: formData
      });

      if(res.success) {
        if(res.no_changes) {
          toast.info(res.message);
        } else {
          toast.success("Settings updated successfully!");
        }
        fetchClinicData(); 
      } else {
        toast.error("Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    }
    hideLoader();
  };

  return (
    <div className='w-full'>
      <div className="pb-5 mb-8 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
          <HiOutlineBuildingOffice2 className="text-(--clr-primary)" />
          Branch Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Update your clinic's information and contact details.
        </p>
      </div>

      {isLoading ? (
        <LoaderV2 />
      ) : (
        <form onSubmit={handleSubmit}>
          <section className='grid gap-4'>
            {/* logo */}
            <div className='pb-8 mb-5 border-b border-gray-300'>
              <h1 className='flex items-center gap-1 mb-4 text-xl font-medium'>
                <CiImageOn className='text-(--clr-text-header)' />
                <span>Clinic Logo</span>
              </h1>
              <div className='grid grid-cols-1 place-content-center'>
                <InputImage 
                  label="Upload Logo" 
                  name="logoPic" 
                  isPreview={true}
                  required={true}
                  onChange={handleChange} 
                  error={errors.logoPic} 
                  existingImage={existingPaths.logoPic} 
                />
              </div>

              {isClinicAdmin && (
                <div className="flex flex-col mt-6 pb-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Main Brand Identity</h3>
                  <InputImage 
                    label="Main Brand Logo" 
                    name="brandLogo" 
                    isPreview={true}
                    required={true}
                    onChange={handleChange} 
                    error={errors.brandLogo} 
                    existingImage={existingPaths.brandLogo} 
                  />
                  <div className="mt-4">
                    <Input
                      value={form.mainBrandingName} 
                      label="Main Branding Name" 
                      name="mainBrandingName" 
                      placeholder="Enter the main brand name"
                      isImportant={true} 
                      onChange={handleChange} 
                      error={errors.mainBrandingName} 
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      This updates the core brand name for your entire clinic network.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* clinic information */}
            <div className='pb-8 mb-5 border-b border-gray-300'>
              <h1 className='flex items-center gap-1 mb-4 text-xl font-medium'>
                <HiOutlineBuildingOffice2 className='text-(--clr-text-header)' />
                <span>Clinic Information</span>
              </h1>
              
              <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                <Input
                  value={form.clinicName} 
                  label="Clinic Name" 
                  name="clinicName" 
                  placeholder="Enter your clinic name"
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.clinicName} 
                />
                <Input
                  value={form.completeAddress} 
                  label="Complete Address" 
                  name="completeAddress" 
                  placeholder="Street, Barangay, Building No., etc."
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.completeAddress} 
                />
                <Input
                  value={form.municipality} 
                  label="City/Municipality" 
                  name="municipality" 
                  placeholder="Binangonan"
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.municipality} 
                />
                <Input
                  value={form.province} 
                  label="Province" 
                  name="province" 
                  placeholder="Rizal"
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.province} 
                />
                <Input
                  value={form.zipCode} 
                  label="Zip Code" 
                  name="zipCode" 
                  placeholder="1940"
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.zipCode} 
                />
                <Input
                  value={form.est} 
                  label="Year Established" 
                  name="est" 
                  placeholder="2025"
                  isImportant={true} 
                  onChange={handleChange} error={errors.est} 
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
                    className={`border border-gray-300 outline-none rounded-lg p-2 w-full min-h-[220px] mt-2 
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

                <div className='grid gap-1'>
                  <Input
                    value={form.contactNumber}
                    label="Clinic Contact Number"
                    labelStyle="mb-2 ml-1"
                    id="contactNumber"
                    name="contactNumber"
                    isImportant={true}
                    placeholder="09123456789 or (02) 8123-4567"
                    onChange={handleChange}
                    error={errors.contactNumber}
                  />

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

            {/* business & licensing */}
            {!isBranchAdmin && (
              <div className='pb-8 mb-5 border-b border-gray-300'>
                <h1 className='flex items-center gap-1 mb-4 text-xl font-medium'>
                  <CiCreditCard1 className='text-(--clr-text-header)' />
                  <span>Business & Licensing Information</span>
                </h1>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6'>
                  <div className="flex flex-col">
                    <InputImage 
                      label="Tin Picture" 
                      name="tinNumberPic" 
                      isPreview 
                      onChange={handleChange} 
                      error={errors.tinNumberPic} 
                      existingImage={existingPaths.tinNumberPic} 
                    />
                    <Input 
                      value={form.tinNumber} 
                      label="Tin Number" 
                      name="tinNumber" 
                      placeholder="123-456-789-000"
                      isImportant={true} 
                      onChange={handleChange} 
                      error={errors.tinNumber} 
                    />
                  </div>
                  <div className="flex flex-col">
                    <InputImage 
                      label="Business Permit Picture" 
                      name="businessPermitPic" 
                      isPreview 
                      onChange={handleChange} 
                      error={errors.businessPermitPic} 
                      existingImage={existingPaths.businessPermitPic}
                    />
                    <Input 
                      value={form.businessPermitNumber} 
                      label="Permit Number" 
                      name="businessPermitNumber" 
                      placeholder="BP-2025-12345"
                      isImportant={true} onChange={handleChange} 
                      error={errors.businessPermitNumber} 
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="flex justify-end mt-8">
            <button 
              type="submit"
              className="w-full md:w-auto px-10 py-3 bg-(--clr-primary) text-white rounded-xl font-bold active:scale-95 disabled:opacity-50 transition-all text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <HiSave size={18} />
              Save Changes
            </button>
          </div>
        </form> 
      )}
    </div>   
  )
}