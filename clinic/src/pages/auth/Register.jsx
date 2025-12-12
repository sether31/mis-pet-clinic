import { useState } from 'react'
import { Link } from 'react-router-dom';
// components
import Input from '../../components/Input';
import InputImage from '../../components/InputImage';
import Button from '../../components/Button';
import ValidateEmail from '../../components/ValidateEmail';
// icons
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { IoPersonOutline } from "react-icons/io5";
import { CiCreditCard1 } from "react-icons/ci";
import { LiaBusinessTimeSolid } from "react-icons/lia";

const API_URL = import.meta.env.VITE_API_URL;

export default function Register() {
  const [form, setForm] = useState({
    email: '',
    clinicName: '',
    completeAddress: '',
    municipality: '',
    province: '',
    zipCode: '',
    est: '',
    website: '',
    facebook: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    tinNumber: '',
    businessPermitNumber: '',
    vetLicenseNumber: '',
    clinicDescription: '',
    clinicStartTime: '',
    clinicEndTime: '',
    services: [],
    agreeTerms: false,
    tinNumberPic: null,
    businessPermitPic: null,
    vetLicensePic: null
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const inputLabels = {
    clinicName: "Clinic Name",
    completeAddress: "Complete Address",
    municipality: "City/Municipality",
    province: "Province",
    zipCode: "Zip Code",
    est: "Year Established",
    website: "Website",
    facebook: "Facebook",
    email: "Email",
    firstName: "First Name",
    lastName: "Last Name",
    password: "Password",
    confirmPassword: "Confirm Password",
    tinNumber: "Tin Number",
    businessPermitNumber: "Business Permit Number",
    vetLicenseNumber: "Veterinarian License Number",
    clinicStartTime: "Clinic Start Time",
    clinicEndTime: "Clinic End Time",
    services: "Services",
    agreeTerms: "Terms & Conditions",
    tinNumberPic: "Tin Picture",
    businessPermitPic: "Business Permit Picture",
    vetLicensePic: "Veterinarian License Picture",
    clinicDescription: "Clinic Description"
  };

  const serviceLabels = {
    generalCheckup: "General Checkup",
    vaccination: "Vaccination",
    surgery: "Surgery",
    grooming: "Grooming",
    emergencyService: "Emergency Service"
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
      const selected = [...form.services];

      if(checked) {
        selected.push(value);
      } else {
        selected.splice(selected.indexOf(value), 1);
      }

      setForm(prev => ({ ...prev, services: selected }));

      setErrors(prev => ({
        ...prev,
        services: selected.length === 0 ? "Select at least one service." : ""
      }));

      return;
    }

    // check email
    if(name === "email") {
      if (!value.trim()) {
        setErrors(prev => ({ ...prev, email: `${inputLabels[name]} is required.` }));
      } else if (!ValidateEmail(value)) {
        setErrors(prev => ({ ...prev, email: "Invalid email." }));
      } else {
        setErrors(prev => ({ ...prev, email: "valid" }));
      }
      return;
    }

    // check password
    if(name === "confirmPassword") {
      setErrors(prev => ({
        ...prev,
        confirmPassword:
          value === form.password ? "valid" : "Passwords do not match."
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
      "email",
      "firstName",
      "lastName",
      "password",
      "confirmPassword",
      "tinNumber",
      "businessPermitNumber",
      "vetLicenseNumber",
      "agreeTerms"
    ];

    requiredInputFields.forEach(field => {
      if (!form[field] || (typeof form[field] === "string" && !form[field].trim())) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    // --- EMAIL VALIDATION ---
    if(form.email && !ValidateEmail(form.email)) {
      newErrors.email = "Invalid email.";
    }
  
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

    // check password
    if(form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    // check time
    if(form.clinicStartTime && !form.clinicEndTime) {
      newErrors.clinicEndTime = "End time is required if start time is set.";
    }

    if (form.clinicEndTime && !form.clinicStartTime) {
      newErrors.clinicStartTime = "Start time is required if end time is set.";
    }

    return newErrors;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const validationErrors = validateForm();
    setErrors(validationErrors);
    if(Object.keys(validationErrors).length > 0) {
      setLoading(false);
      return;  
    }

    console.log("Submitting...", form);
    
    setLoading(false);
  };


  return (
    <div className='mb-20 container-xl'>
      <div className='flex flex-col items-center justify-between gap-4 my-5 md:flex-row'>
        <h1 className='text-2xl font-medium'>LOGO</h1>
        <h1 className='flex items-center gap-1 text-base'>
          Already have an account? 
          <Link to="/login" className='underline text-[var(--clr-dark-green)] hover:opacity-75'>Sign in</Link>
        </h1>
      </div>
      
      <h1 className='mb-4 text-4xl font-bold text-[var(--clr-dark-green)]'>Register Your Clinic</h1>
      <p className='mb-12 text-base'> 
        Create your clinic account to get started with the Pet Clinic Platform. <br />
        Please provide accurate information so we can verify your clinic and set up your account.
      </p>

      <form onSubmit={handleSubmit}>
        <section className='grid gap-4'>
          {/* Clinic Information */}
          <div className='pb-8 mb-5 border-gray-300 border-b-1'>
            <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
              <HiOutlineBuildingOffice2 />
              <span>Clinic Information</span>
            </h1>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Input
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
                label="Year Establish"
                labelStyle="mb-1 ml-1"
                id="est"
                name="est"
                isOptional={true}
                placeholder="2025"
                onChange={handleChange}
                error={errors.est}
              />

              <Input
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

          {/* Owner Information< */}
          <div className='pb-8 mb-5 border-gray-300 border-b-1'>
            <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
              <IoPersonOutline /> 
              <span>Owner Information</span>
            </h1>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <Input
                label="Email"
                labelStyle="mb-1 ml-1"
                id="email"
                isImportant={true}
                name="email"
                placeholder="Enter your email"
                onChange={handleChange}
                error={errors.email}
              />
              <Input
                label="First Name"
                labelStyle="mb-1 ml-1"
                id="firstName"
                isImportant={true}
                name="firstName"
                placeholder="Enter your first name"
                onChange={handleChange}
                error={errors.firstName}
              />

              <Input
                label="Last Name"
                labelStyle="mb-1 ml-1"
                id="lastName"
                isImportant={true}
                name="lastName"
                placeholder="Enter your last name"
                onChange={handleChange}
                error={errors.lastName}
              />

              <Input
                type='password'
                label="Password"
                labelStyle="mb-1 ml-1"
                id="password"
                isImportant={true}
                name="password"
                placeholder="Enter your password"
                onChange={handleChange}
                error={errors.password}
              />

              <Input
                type='password'
                label="Confirm password"
                labelStyle="mb-1 ml-1"
                id="confirmPassword"
                isImportant={true}
                name="confirmPassword"
                placeholder="Confirm your password"
                onChange={handleChange}
                error={errors.confirmPassword}
              />
            </div>
          </div>

          {/* Business & licensing Information */}
          <div className='pb-8 mb-5 border-gray-300 border-b-1'>
            <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
              <CiCreditCard1 />
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
            
          {/* Services and Operations */}
          <div className='pb-8 mb-5 border-gray-300 border-b-1'>
            <h1 className='flex items-center gap-1 mb-2 text-xl font-medium'>
              <LiaBusinessTimeSolid />
              <span>Services and Operations</span>
            </h1>
            <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
              <div>
                <div className='mb-4'>
                  <label htmlFor='clinicDescription' className='ml-1 text-base font-medium text-gray-700'>
                    Clinic Description {' '}
                    <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    id="clinicDescription"
                    name="clinicDescription"
                    className={`border border-gray-300 rounded-lg p-2 w-full min-h-15 mt-2`}
                    placeholder="Brief description of your clinic, specialization, and what makes you unique..."
                    onChange={handleChange} 
                    value={form.clinicDescription} 
                  ></textarea>
                </div>

                <div className='flex gap-4'>
                  <Input
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
              </div>

              {/* Services Offered */}
              <div>
                <h1 className='mb-2 text-base font-medium text-gray-700'>
                  Services Offered {' '}
                  <span className="text-red-500">*</span>
                </h1>
                
                <div className='grid grid-cols-1 gap-2 lg:grid-cols-2'>
                  {['generalCheckup','vaccination','surgery','grooming','emergencyService'].map(service => (
                    <label key={service}>
                      <input
                        type="checkbox"
                        name="services"
                        value={service}
                        checked={form.services.includes(service)}
                        onChange={handleChange}
                        className='accent-[var(--clr-dark-green)]'
                      />
                      {' '} {serviceLabels[service]}
                    </label>
                  ))}
                </div>
                {/* errors */}
                {errors.services && (
                  <p className="text-red-500 text-sm mt-1">{errors.services}</p>
                )}
              </div>
            </div>
          </div>

          <div className='p-4 bg-gray-200 rounded-md'>
            <h1 className='text-md font-medium mb-1'>TERMS & CONDITION</h1>
            <div className='flex items-center gap-1'>
              <input
                type="checkbox"
                name="agreeTerms"
                checked={form.agreeTerms}
                onChange={handleChange}
                className='accent-[var(--clr-dark-green)]'
              />
              <label htmlFor="emergency-service">I agree to terms and conditions</label>
            </div>
            {errors.agreeTerms && (
              <p className="flex items-center text-sm text-red-500 mt-1">{errors.agreeTerms}</p>
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
  )
}
