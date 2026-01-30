import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'; // UseParams is key for deep routing
import { toast } from 'react-toastify';
import { useUI } from '../../../hooks/useUI';
import { authFetch } from '../../../utils/authFetch'
import Input from '../../../components/Input';
import InputImage from '../../../components/InputImage';
import Button from '../../../components/Button';
import { HiMiniExclamationCircle, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { CiCreditCard1, CiImageOn } from "react-icons/ci";

const API_URL = import.meta.env.VITE_API_URL;

const initialFormState = {
  logoPic: null, 
  clinicName: '',
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
  vetLicenseNumber: '',
  tinNumberPic: null,
  businessPermitPic: null,
  vetLicensePic: null
}

export default function GeneralBranchSettings() {
  const { branchId } = useParams(); // branchId comes from the URL /branch/:branchId/settings
  const { showLoader, hideLoader } = useUI();
  const [form, setForm] = useState(initialFormState);
  const [existingPaths, setExistingPaths] = useState({
    logoPic: '',
    tinNumberPic: '',
    businessPermitPic: '',
    vetLicensePic: ''
  });
  const [errors, setErrors] = useState({});

  const inputLabels = {
    logoPic: "Clinic Logo",
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
    tinNumberPic: "Tin Picture",
    businessPermitPic: "Business Permit Picture",
    vetLicensePic: "Veterinarian License Picture"
  };

  const fetchClinicData = async () => {
    showLoader("Loading settings...");
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/branch-settings/general-setting/get-general-branch-settings.php`, {
        method: 'POST',
        body: JSON.stringify({ branch_id: branchId }) 
      });
      
      if(res.success && res.data) {
        setForm(prev => ({
          ...prev,
          clinicName: res.data.name || '',
          completeAddress: res.data.address || '',
          municipality: res.data.municipality || '',
          province: res.data.province || '',
          zipCode: res.data.zip_code || '',
          est: res.data.est || '',
          clinicDescription: res.data.description || '',
          website: res.data.website || '',
          facebook: res.data.facebook || '',         
          tinNumber: res.data.tin_id_number || '',
          businessPermitNumber: res.data.business_permit_number || '',
          vetLicenseNumber: res.data.vet_license_number || '',
        }));

        setExistingPaths({
          logoPic: res.data.logo_picture || '', 
          tinNumberPic: res.data.tin_id_picture || '',
          businessPermitPic: res.data.business_permit_picture || '',
          vetLicensePic: res.data.vet_license_picture || ''
        });
      }
    } catch(err) {
      toast.error("Failed to load clinic settings.");
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    fetchClinicData();
  }, [branchId]); // Refresh if branchId changes

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
      "clinicName", "completeAddress", "municipality", "province",
      "zipCode", "est", "clinicDescription",
      "tinNumber", "businessPermitNumber", "vetLicenseNumber"
    ];

    requiredInputFields.forEach(field => {
      if(!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    // Valid if there is a NEW file OR an EXISTING path
    ["logoPic", "tinNumberPic", "businessPermitPic", "vetLicensePic"].forEach(field => {
      if(!form[field] && !existingPaths[field]) {
        // Logo is usually optional, remove this if you want it optional:
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader("Updating...")

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
        toast.success("Settings updated successfully!");
        fetchClinicData(); 
      } else {
        toast.error(res.message || "Failed to update settings");
      }
    } catch(error) {
      toast.error("An error occurred during update");
    }
    hideLoader();
  };

  return (
    <div className='w-full'>
      <form onSubmit={handleSubmit}>
        <section className='grid gap-4'>
          {/* logo */}
          <div className='pb-8 mb-5 border-b border-gray-300'>
             <h1 className='flex items-center gap-1 mb-4 text-xl font-medium'>
              <CiImageOn className='text-(--clr-text-header)' />
              <span>Clinic Logo</span>
            </h1>
            <div className='grid grid-cols-1 lg:grid-cols-2'>
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
                isImportant={true} 
                onChange={handleChange} 
                error={errors.clinicName} 
              />
              <Input
                value={form.completeAddress} 
                label="Complete Address" 
                name="completeAddress" 
                isImportant={true} 
                onChange={handleChange} 
                error={errors.completeAddress} 
              />
              <Input
                value={form.municipality} 
                label="City/Municipality" 
                name="municipality" 
                isImportant={true} 
                onChange={handleChange} 
                error={errors.municipality} 
              />
              <Input
                value={form.province} 
                label="Province" 
                name="province" 
                isImportant={true} 
                onChange={handleChange} 
                error={errors.province} 
              />
              <Input
                value={form.zipCode} 
                label="Zip Code" 
                name="zipCode" 
                isImportant={true} 
                onChange={handleChange} 
                error={errors.zipCode} 
              />
              <Input
                value={form.est} 
                label="Year Established" 
                name="est" 
                isImportant={true} 
                onChange={handleChange} error={errors.est} 
              />

              <div className='mb-4'>
                <label className='ml-1 text-sm font-medium text-gray-700'>
                  Clinic Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.clinicDescription} 
                  name="clinicDescription"
                  className={`border outline-none rounded-lg p-2 w-full min-h-[115px] ${errors.clinicDescription && errors.clinicDescription !== "valid" ? "border-red-500" : "border-gray-300"}`}
                  onChange={handleChange} 
                ></textarea>
                {errors.clinicDescription && errors.clinicDescription !== "valid" && (
                  <p className="flex items-center mt-1 text-sm text-red-500"><HiMiniExclamationCircle className="mr-1" />{errors.clinicDescription}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Input value={form.website} label="Website" name="website" isOptional onChange={handleChange} />
                <Input value={form.facebook} label="Facebook" name="facebook" isOptional onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* business & licensing */}
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
                  isImportant={true} onChange={handleChange} 
                  error={errors.businessPermitNumber} 
                />
              </div>
              <div className="flex flex-col">
                <InputImage 
                  label="Vet License Picture" 
                  name="vetLicensePic" 
                  isPreview 
                  onChange={handleChange} 
                  error={errors.vetLicensePic} 
                  existingImage={existingPaths.vetLicensePic} 
                />
                <Input 
                  value={form.vetLicenseNumber} 
                  label="License Number" 
                  name="vetLicenseNumber" 
                  isImportant={true} 
                  onChange={handleChange} 
                  error={errors.vetLicenseNumber} 
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-start mt-8">
          <Button type="submit" variant="primary" className="w-full lg:w-[250px]">
            Save Changes
          </Button>
        </div>
      </form> 
    </div>   
  )
}