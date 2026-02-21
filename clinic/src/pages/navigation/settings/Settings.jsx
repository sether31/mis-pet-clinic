import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
import { useUser } from '../../../hooks/useUser'; 
// utils
import { authFetch } from '../../../utils/authFetch';
import { validateEmail } from '../../../utils/validateEmail';
// components
import Input from '../../../components/Input';
import InputImage from '../../../components/InputImage';
import OTPInput from '../../../components/OtpInput';
import Header from '../../../components/Header';
// icons
import { 
  RiShieldFlashLine, 
  RiMailSettingsLine, 
  RiLockPasswordLine, 
  RiFingerprintLine,
  RiUserLine
} from 'react-icons/ri';

const API_URL = import.meta.env.VITE_API_URL;

export default function Settings() {
  const { showLoader, hideLoader } = useUI();
  const { user, refreshUser } = useUser(); 
  
  const [profileData, setProfileData] = useState({ 
    firstName: '', 
    lastName: '', 
    avatar: null, 
    currentAvatarUrl: null 
  });
  const [emailData, setEmailData] = useState({ new_email: '', current_password: '' });
  const [passData, setPassData] = useState({ new_password: '', confirm_password: '' });
  
  const [showOTP, setShowOTP] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); 
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if(user) {
      setProfileData({
        firstName: user.fname || '',
        lastName: user.lname || '',
        avatar: null,
        currentAvatarUrl: user.profile_picture ? `${user.profile_picture}` : null
      });
    }
  }, [user]);

  console.log(user)

  // handle change
  const handleProfileChange = (e) => {
    const { name, value, type, files } = e.target;
    setProfileData(prev => ({ ...prev, [name]: type === 'file' ? files[0] : value }));
    
    if (type !== 'file') {
      setErrors(prev => ({ 
        ...prev, 
        [name]: value.trim() ? "valid" : `${name === 'firstName' ? 'First' : 'Last'} name is required.` 
      }));
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
    
    if(name === "new_email") {
      if (!value.trim()) setErrors(prev => ({ ...prev, new_email: "Email is required." }));
      else if (!validateEmail(value)) setErrors(prev => ({ ...prev, new_email: "Invalid email format." }));
      else setErrors(prev => ({ ...prev, new_email: "valid" }));
    }
    
    if(name === "current_password") {
      setErrors(prev => ({ ...prev, email_pass: value.trim() ? "valid" : "Password required to verify email change." }));
    }
  };

  const handlePassChange = (e) => {
    const { name, value } = e.target;
    setPassData(prev => ({ ...prev, [name]: value }));
    
    if(name === "new_password") {
      if (value.length < 6) setErrors(prev => ({ ...prev, new_password: "Min. 6 characters required." }));
      else setErrors(prev => ({ ...prev, new_password: "valid" }));
    }
    
    if(name === "confirm_password") {
      if (!value.trim()) setErrors(prev => ({ ...prev, confirm_password: "Please confirm your password." }));
      else if (value !== passData.new_password) setErrors(prev => ({ ...prev, confirm_password: "Passwords do not match." }));
      else setErrors(prev => ({ ...prev, confirm_password: "valid" }));
    }
  };

  // handle submit
  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault(); 

    const profileErrors = {
      firstName: profileData.firstName.trim() ? "valid" : "First name is required.",
      lastName: profileData.lastName.trim() ? "valid" : "Last name is required."
    };
    setErrors(prev => ({ ...prev, ...profileErrors }));

    if(profileErrors.firstName !== "valid" || profileErrors.lastName !== "valid") {
      return toast.error("Please provide valid profile information."); 
    }
    
    showLoader("Updating profile...");
    try {
      const fd = new FormData();
      fd.append('first_name', profileData.firstName);
      fd.append('last_name', profileData.lastName);
      if (profileData.avatar) fd.append('profile_pic', profileData.avatar);

      const res = await authFetch(`${API_URL}/api/clinic/general/settings/update-user-profile.php`, {
        method: 'POST',
        body: fd
      });

      if(res?.success) {
        toast.success("Profile updated!");
        if (refreshUser) refreshUser(); 
      } else {
        toast.error(res.message);
      }
    } catch(err) { 
      toast.error("Something went wrong"); 
    } finally { 
      hideLoader(); 
    }
  };

  const requestSecurityOTP = async (e, type) => {
    if (e) e.preventDefault(); 

    let localErrors = {};
    
    if(type === 'change_email') {
      localErrors.new_email = !emailData.new_email.trim() ? "Email is required." : 
      (!validateEmail(emailData.new_email) ? "Invalid email format." : "valid");
      localErrors.email_pass = !emailData.current_password.trim() ? "Password required to verify change." : "valid";
    } else {
      localErrors.new_password = passData.new_password.length < 6 ? "Min. 6 characters required." : "valid";
      localErrors.confirm_password = !passData.confirm_password.trim() ? "Confirmation required." : 
      (passData.confirm_password !== passData.new_password ? "Passwords do not match." : "valid");
    }

    setErrors(prev => ({ ...prev, ...localErrors }));

    const hasErrors = Object.values(localErrors).some(val => val !== "valid");
    if(hasErrors) {
      return toast.error("Please fill in all required fields correctly."); 
    }

    setPendingAction(type);
    showLoader("Sending verification code...");
    try {
      const payload = { 
        type, 
        current_password: type === 'change_email' ? emailData.current_password : null 
      };
      const res = await authFetch(`${API_URL}/api/clinic/general/settings/request-security-otp.php`, {
        method: 'POST', 
        body: JSON.stringify(payload) 
      });

      if(res?.success) {
        setShowOTP(true); 
        toast.success("Verification code sent to your email.");
      } else {
        if(res.message === "Password incorrect.") {
          setErrors(prev => ({ ...prev, email_pass: "Incorrect current password." }));
        }
        toast.error(res.message);
      }
    } catch(err) { 
      toast.error("Something went wrong"); 
    } finally { 
      hideLoader(); 
    }
  };

  const handleOTPComplete = async (otp) => {
    showLoader("Verifying...");
    const endpoint = pendingAction === 'change_email' ? 'update-email.php' : 'update-password.php';
    const body = pendingAction === 'change_email' 
      ? { new_email: emailData.new_email, otp } 
      : { new_password: passData.new_password, otp };

    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/settings/${endpoint}`, {
        method: 'POST', 
        body: JSON.stringify(body)
      });
      if(res?.success) {
        toast.success(res.message);
        setShowOTP(false);
        setEmailData({ new_email: '', current_password: '' });
        setPassData({ new_password: '', confirm_password: '' });
        setErrors({});
        if (refreshUser) refreshUser();
      } else {
        toast.error(res.message);
      }
    } catch(err) { 
      toast.error("Verification failed"); 
    } finally { 
      hideLoader(); 
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <div className="flex-1 w-full px-4 py-6 md:px-8">
        <section className="grid w-full grid-cols-1 gap-10 p-6 px-6 mx-auto bg-white border border-gray-300 rounded-xl lg:grid-cols-2 container-xl">
          
          {/* profile */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 pb-2 text-lg font-bold text-gray-900 border-b border-gray-100">
              <RiUserLine size={24} className="text-gray-700" />
              Personal Information
            </div>
            <InputImage 
              label="Profile Picture" 
              name="avatar" 
              isPreview={true} 
              existingImage={profileData.currentAvatarUrl} 
              size="150px" 
              onChange={handleProfileChange} 
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input 
                label="First Name" 
                name="firstName" 
                value={profileData.firstName} 
                onChange={handleProfileChange} 
                placeholder="e.g. John"
                error={errors.firstName}
              />
              <Input 
                label="Last Name" 
                name="lastName" 
                value={profileData.lastName} 
                onChange={handleProfileChange} 
                placeholder="e.g. Doe"
                error={errors.lastName}
              />
            </div>
            <button type="button" onClick={(e) => handleUpdateProfile(e)} className="px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary)/95 hover:bg-(--clr-primary) hover:opacity-90 transition-all w-full sm:w-auto cursor-pointer">
              Update Profile
            </button>
          </section>

          <div className="hidden lg:block"></div>

          {/* email */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 pb-2 text-lg font-bold text-gray-900 border-b border-gray-100">
              <RiMailSettingsLine size={24} className="text-gray-700" />
              Account Email
            </div>
            <div className="space-y-4">
              <Input 
                label="New Email Address" 
                name="new_email" 
                value={emailData.new_email} 
                onChange={handleEmailChange} 
                placeholder="Enter your new email address"
                icon={<RiMailSettingsLine size={18} className="text-gray-400"/>} 
                error={errors.new_email} 
              />
              <Input 
                label="Confirm with Password" 
                name="current_password" 
                type="password" 
                value={emailData.current_password} 
                onChange={handleEmailChange} 
                placeholder="Type password to verify change"
                icon={<RiShieldFlashLine size={18} className="text-gray-400"/>} 
                error={errors.email_pass}
              />
              <button type="button" onClick={(e) => requestSecurityOTP(e, 'change_email')} className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary)/95 hover:bg-(--clr-primary) transition-all active:scale-95 w-full sm:w-auto cursor-pointer">
                Request Email Change
              </button>
            </div>
          </section>

          {/* password */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 pb-2 text-lg font-bold text-gray-900 border-b border-gray-100">
              <RiFingerprintLine size={24} className="text-gray-700" />
              Security Password
            </div>
            <div className="space-y-4">
              <Input 
                label="New Password" 
                name="new_password" 
                type="password" 
                value={passData.new_password} 
                onChange={handlePassChange} 
                placeholder="Min. 6 characters"
                icon={<RiLockPasswordLine size={18} className="text-gray-400"/>} 
                error={errors.new_password}
              />
              <Input 
                label="Confirm New Password" 
                name="confirm_password" 
                type="password" 
                value={passData.confirm_password} 
                onChange={handlePassChange} 
                placeholder="Repeat your new password"
                icon={<RiLockPasswordLine size={18} className="text-gray-400"/>} 
                error={errors.confirm_password} 
              />
              <button type="button" onClick={(e) => requestSecurityOTP(e, 'change_password')} className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary)/95 hover:bg-(--clr-primary) transition-all active:scale-95 w-full sm:w-auto cursor-pointer">
                Request Password Change
              </button>
            </div>
          </section>
        </section>
      </div>

      {showOTP && (
        <OTPInput 
          length={6} 
          onComplete={handleOTPComplete} 
          setShowOTP={setShowOTP} 
          error={errors.otp} 
          actionLabel={pendingAction === 'change_email' ? 'Email Change' : 'Password Change'} 
        />
      )}
    </div>
  );
}