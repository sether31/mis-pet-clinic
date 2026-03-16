import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI';
import { usePlatform } from '../../hooks/usePlatform';
// utils
import wait from '../../utils/wait';
import { authFetch } from '../../utils/authFetch'
import { validRoleToken } from '../../utils/validRoleToken';
// components
import Input from '../../components/Input';
import InputImage from '../../components/InputImage';
import Button from '../../components/Button';
// icons
import { HiMiniExclamationCircle, HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { CiCreditCard1 } from "react-icons/ci";
import { IoLogOut, IoRefreshOutline, IoWarningOutline } from "react-icons/io5";
import { FaCircleInfo, FaCircleCheck } from "react-icons/fa6";

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
  firstName: '',
  lastName: '',
  tinNumber: '',
  businessPermitNumber: '',
  agreeTerms: false,
  tinNumberPic: null,
  businessPermitPic: null
}

export default function PendingUser() {
  const navigate = useNavigate();
  const { platformData } = usePlatform();
  const { showLoader, hideLoader } = useUI();
  const [form, setForm] = useState(initialFormState);
  const [existingPaths, setExistingPaths] = useState({
    tinNumberPic: '',
    businessPermitPic: ''
  });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState();

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
    firstName: "First Name",
    lastName: "Last Name",
    tinNumber: "Tin Number",
    businessPermitNumber: "Business Permit Number",
    agreeTerms: "Terms & Conditions",
    tinNumberPic: "Tin Picture",
    businessPermitPic: "Business Permit Picture"
  };

  const checkAccess = async (isManualRefresh = false) => {
    if(isManualRefresh) showLoader();

    try {
      // check role
      const user = validRoleToken(['clinic_admin']);
      if (!user || user.role !== 'clinic_admin') {
        navigate('/clinic/login', { replace: true });
        return;
      }

      // check if user is approve
      if(user.status === 'approved') {
        navigate('/clinic/select-branch', { replace: true });
        return;
      }

      // check if user disabled
      if(user.status === 'disabled') {
        toast.error("Your account has been disabled. Please contact support.");
        await wait(1000);
        sessionStorage.clear();
        navigate('/login', { replace: true });
        return;
      }

      // fetch data
      const response = await authFetch(`${API_URL}/api/auth/get-pending-user-data.php`);
      if(response.success && response.data) {
        const { user, clinic, new_token } = response.data;
        const newStatus = clinic.status;

        // handle unauthorized
        if(response.status === 403) {
          navigate('/login', { replace: true });
          return;
        }

        // check if user status updated on server side
        if(user.status === 'approved' && clinic.status === 'approved') {
          setStatus("approved");
          showLoader("Logging in...");
          toast.success("Your account has been approved!");

          if(new_token) {
            sessionStorage.setItem('access_token', new_token);
          }
          await wait(2000);
          hideLoader();
          navigate('/clinic/select-branch', { replace: true });
          return;
        }

        // check if user refresh
        if(isManualRefresh) {
          if(newStatus === status) {
            // check if the status is still the same
            toast.info("No changes to your status yet.");
          } else {
            // status change
            toast.success(`Status updated to ${newStatus}!`);
          }
        }
     
        setStatus(newStatus || '');
        setFeedback(clinic.feedback || '');    


        // only update if initial load because only the status adn feedback should be refresh
        if(!isManualRefresh) {
          setForm({
            clinicName: clinic.branch_name || '',
            completeAddress: clinic.location.address || '',
            municipality: clinic.location.municipality || '',
            province: clinic.location.province || '',
            zipCode: clinic.location.zip_code || '',
            est: clinic.established || '',
            clinicDescription: clinic.description || '',
            website: clinic.contact_info.website || '',
            facebook: clinic.contact_info.facebook || '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            tinNumber: clinic.license.tin_id_number || '',
            businessPermitNumber: clinic.license.business_permit_number || '',
            agreeTerms: true,
            tinNumberPic: null,
            businessPermitPic: null
          });
          setExistingPaths({
            tinNumberPic: clinic.license.tin_id_pic || '',
            businessPermitPic: clinic.license.business_permit_pic || ''
          });
        }
      }
    } catch(err) {
      if(isManualRefresh) toast.error("Failed to refresh status.");
    } finally {
      if (isManualRefresh) hideLoader();
    }
  };

  useEffect(() => {
    checkAccess(false);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value
    }));

    // check image
    if(type === "file") {
      const isFileProvided = files[0];
      const hasExisting = existingPaths[name];

      setErrors(prev => ({
        ...prev,
        [name]: (isFileProvided || hasExisting) ? "valid" : `${inputLabels[name]} is required.`
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

  // validate forms
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
      "firstName",
      "lastName",
      "tinNumber",
      "businessPermitNumber",
      "agreeTerms"
    ];

    requiredInputFields.forEach(field => {
      if(!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    // check image
    ["tinNumberPic", "businessPermitPic"].forEach(field => {
      const hasNewFile = form[field] instanceof File;
      const hasExistingFile = existingPaths[field] && existingPaths[field] !== '';

      if (!hasNewFile && !hasExistingFile) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader("Submitting...")

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
      if (form[key] !== null) {
        formData.append(key, form[key]);
      }
    });

    try {
      const res = await authFetch(`${API_URL}/api/auth/update-pending-user-data.php`, {
        method: "POST",
        body: formData
      });

      if(!res.success) {
        toast.error("Something went wrong")
        hideLoader();
        return;
      }
      toast.success("Clinic details successfully updated!");

      await checkAccess(true);
    } catch(error) {
      toast.error("Something went wrong");
    }
    hideLoader();
  };

  const handleLogout = async () => {
    showLoader("Logging out...")
    toast.info("Logging out...");
    sessionStorage.clear(); 
    await wait(1200);
    hideLoader();
    navigate('/clinic/login', { replace: true });
  };


  return (
    <>
      <div className='mb-20 container-xl'>
        {/* header */}
        <div className='flex items-center justify-between gap-4 my-5'>
           <div className="flex items-center gap-2">
            {platformData?.platform_logo && (
              <img 
                src={`${API_URL}/${platformData.platform_logo}`} 
                alt="Logo" 
                className="object-contain w-auto h-6 rounded-sm"
                onError={(e) => (e.target.style.display = 'none')} 
              />
            )}
            
            <h1 className="text-2xl font-bold text-(--clr-text-header) tracking-tight">
              {platformData?.platform_name || "LOGO"}
            </h1>
          </div>

          {/* logout */}
          <Button 
            type="button" 
            variant="secondary" 
            className="flex items-center justify-center gap-1 cursor-pointer w-max"
            onClick={handleLogout}
          >
            <IoLogOut />
            Logout
          </Button>
        </div>
        
        <div className="flex flex-col gap-2 mb-4 md:items-center md:flex-row">
          <h1 className='text-3xl sm:text-4xl font-bold text-(--clr-text-header)'>Review Your Clinic</h1>

          {/* status */}
          <div className={`flex w-max items-center gap-2 px-4 py-2 rounded-full border transition-colors ${
            status === "approved" ? 'bg-green-50 border-green-200' : 
            status === "rejected" ? 'bg-red-50 border-red-200' : 
            'bg-amber-50 border-amber-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              status === "approved" ? 'bg-green-500' : 
              status === "rejected" ? 'bg-red-500 animate-pulse' : 
              'bg-amber-500 animate-pulse'
            }`}></div>
            <span className={`text-sm font-medium capitalize ${
              status === "approved" ? 'text-(--clr-text-header)' : 
              status === "rejected" ? 'text-red-700' : 
              'text-amber-700'
            }`}>
              Status: {status}
            </span>
          </div>
        </div>
        
        {/* check feedback */}
        <div className="mb-8">
          {status === "approved" ? (
            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <div className="flex items-center gap-2 mb-2 text-green-700">
                <FaCircleCheck size={20} />
                <h3 className="text-lg font-bold">Verification Successful</h3>
              </div>
              <p className="text-sm font-medium text-(--clr-text-header)">
                Your clinic has been approved! Redirecting you to select branch...
              </p>
            </div>
          ) : status === "rejected" ? (
            <div className="p-4 border-l-4 border-red-400 bg-red-50">
              <div className="flex items-center gap-2 mb-2 text-red-700">
                <IoWarningOutline size={20} />
                <h3 className="text-lg font-bold">Action Required: Verification Issue</h3>
              </div>
              <p className="text-sm font-medium text-red-800">
                Reason: {feedback || "Please review your documents and resubmit."}
              </p>
            </div>
          ) : (
            <div className="p-4 border-l-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 mb-2 text-amber-700">
                <FaCircleInfo size={20} />
                <h3 className="text-lg font-bold">Verification In Progress</h3>
              </div>
              <p className="text-sm font-medium text-amber-800">
                Hello, we are currently verifying your data. You can update your details below if you noticed any mistakes.
              </p>
            </div>
          )}
        </div>

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
                  <label htmlFor='clinicDescription' className='ml-1 text-base font-medium text-gray-700'>
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
                    <p className="flex items-center text-sm text-red-500">
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
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6'>
                {/* tin id */}
                <div className="flex flex-col">
                  <InputImage
                    className="mt-4"
                    label="Tin Number Picture"
                    name="tinNumberPic"
                    isPreview={true}
                    onChange={handleChange}
                    error={errors.tinNumberPic}
                    existingImage={existingPaths.tinNumberPic}
                  />
                  <Input
                    value={form.tinNumber}
                    label="Tin Number"
                    labelStyle="mb-1 ml-1 mt-2"
                    id="tinNumber"
                    isImportant={true}
                    name="tinNumber"
                    placeholder="123-456-789-000"
                    onChange={handleChange}
                    error={errors.tinNumber}
                  />
                </div>

                {/* business permit*/}
                <div className="flex flex-col">
                  <InputImage
                    className="mt-4"
                    label="Business Permit Picture"
                    name="businessPermitPic"
                    isPreview={true}
                    onChange={handleChange}
                    error={errors.businessPermitPic}
                    existingImage={existingPaths.businessPermitPic}
                  />
                  <Input
                    value={form.businessPermitNumber}
                    label="Business Permit Number"
                    labelStyle="mb-1 ml-1 mt-2"
                    id="businessPermitNumber"
                    isImportant={true}
                    name="businessPermitNumber"
                    placeholder="BP-2025-12345"
                    onChange={handleChange}
                    error={errors.businessPermitNumber}
                  />
                </div>

                {/* vet license */}
                {/* <div className="flex flex-col">
                  <InputImage
                    className="mt-4"
                    label="Veterinarian License Picture"
                    name="vetLicensePic"
                    isPreview={true}
                    onChange={handleChange}
                    error={errors.vetLicensePic}
                    existingImage={existingPaths.vetLicensePic}
                  />
                  <Input
                    value={form.vetLicenseNumber}
                    label="Veterinarian License Number"
                    labelStyle="mb-1 ml-1 mt-2"
                    id="vetLicenseNumber"
                    isImportant={true}
                    name="vetLicenseNumber"
                    placeholder="12345"
                    onChange={handleChange}
                    error={errors.vetLicenseNumber}
                  />
                </div> */}
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

          <div className="flex flex-col items-center gap-3 mt-8 md:flex-row">
            <Button 
              type="submit" 
              variant="primary" 
              className="w-full lg:w-[200px] cursor-pointer"
            >
              Update your clinic
            </Button>

            <Button 
              type="button" 
              variant="secondary" 
              className="w-full lg:w-[200px] cursor-pointer flex gap-1 items-center justify-center"
              onClick={() => checkAccess(true)}
            >
              <IoRefreshOutline />
              Refresh status
            </Button>
          </div>
        </form> 
      </div>   

      <motion.div
        className="h-screen w-screen bg-(--clr-primary) fixed top-0 z-100 hidden lg:block overflow-hidden"
        initial={{ y: 0 }}
        animate={{ y: '-100%' }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      ></motion.div>
    </>
  )
}
