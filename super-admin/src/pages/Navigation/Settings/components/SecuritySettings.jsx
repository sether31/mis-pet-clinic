import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../../hooks/useUI';
import { useUser } from '../../../../hooks/useUser'; 
// utils
import { authFetch } from '../../../../utils/authFetch';
import { validateEmail } from '../../../../utils/validateEmail';
// components
import Input from '../../../../components/Input';
import InputImage from '../../../../components/InputImage';
import OTPInput from '../../../../components/OtpInput';
// icons
import { 
  RiShieldFlashLine, 
  RiMailSettingsLine, 
  RiLockPasswordLine, 
  RiFingerprintLine,
  RiUserLine
} from 'react-icons/ri';
import { HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function SecuritySettings() {
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
    if (user) {
      setProfileData({
        firstName: user.fname || '',
        lastName: user.lname || '',
        avatar: null,
        currentAvatarUrl: user.profile_picture ? `${user.profile_picture}` : null
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value, type, files } = e.target;
    setProfileData(prev => ({ ...prev, [name]: type === 'file' ? files[0] : value }));
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
      setErrors(prev => ({ ...prev, email_pass: value.trim() ? "valid" : "Password required." }));
    }
  };

  const handlePassChange = (e) => {
    const { name, value } = e.target;
    setPassData(prev => ({ ...prev, [name]: value }));
    if(name === "new_password") {
      if (value.length < 6) setErrors(prev => ({ ...prev, new_password: "Min. 6 characters." }));
      else setErrors(prev => ({ ...prev, new_password: "valid" }));
    }
    if(name === "confirm_password") {
      if (value !== passData.new_password) setErrors(prev => ({ ...prev, confirm_password: "Passwords do not match." }));
      else setErrors(prev => ({ ...prev, confirm_password: "valid" }));
    }
  };

  const handleUpdateProfile = async () => {
    showLoader("Updating profile...");
    try {
      const fd = new FormData();
      fd.append('first_name', profileData.firstName);
      fd.append('last_name', profileData.lastName);
      if (profileData.avatar) fd.append('profile_pic', profileData.avatar);

      const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/security/update-super-admin-profile.php`, {
        method: 'POST',
        body: fd
      });

      if(res?.success) {
        toast.success("Profile updated!");
        if (refreshUser) refreshUser(res);
      } else {
        toast.error(res.message);
      }
    } catch (err) { 
      toast.error("Something went wrong"); 
    } finally { 
      hideLoader(); 
    }
  };

  const requestSecurityOTP = async (type) => {
    let localErrors = {};
    let hasErrors = false;
    if(type === 'change_email') {
      if (!emailData.new_email.trim()) localErrors.new_email = "Email is required.";
      if (!emailData.current_password.trim()) localErrors.email_pass = "Password required.";
      if(localErrors.new_email || (errors.new_email && errors.new_email !== "valid") || (errors.email_pass && errors.email_pass !== "valid")) hasErrors = true;
    } else {
      if (!passData.new_password.trim()) localErrors.new_password = "Required.";
      if (passData.confirm_password !== passData.new_password) localErrors.confirm_password = "Mismatch.";
      if (localErrors.new_password || localErrors.confirm_password || (errors.new_password && errors.new_password !== "valid") || (errors.confirm_password && errors.confirm_password !== "valid")) hasErrors = true;
    }

    setErrors(prev => ({ ...prev, ...localErrors }));
    if(hasErrors) return toast.error("Please fix the errors first.");

    setPendingAction(type);
    showLoader("Sending code...");
    try {
      const payload = { type, current_password: type === 'change_email' ? emailData.current_password : null };
      const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/security/request-security-otp.php`, {
        method: 'POST', body: JSON.stringify(payload) 
      });
      if(res?.success) {
        setShowOTP(true);
        toast.success("Verification code sent to your email.");
      } else {
        if(res.message === "Password incorrect.") {
          setErrors(prev => ({ ...prev, email_pass: "Password incorrect." }));
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
    const body = pendingAction === 'change_email' ? { ...emailData, otp } : { ...passData, otp };
    try {
      const res = await authFetch(`${API_URL}/api/super-admin/platform-settings/security/${endpoint}`, {
        method: 'POST', body: JSON.stringify(body)
      });
      if(res?.success) {
        toast.success(res.message);
        setShowOTP(false);
        setEmailData({ new_email: '', current_password: '' });
        setPassData({ new_password: '', confirm_password: '' });
        setErrors({});
        if (refreshUser) refreshUser(res);
      } else {
        toast.error(res.message);
      }
    } catch(err) { 
      toast.error("Something went wrong"); 
    } finally { 
      hideLoader(); 
    }
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-16"> 
        
        {/* email */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 text-lg font-bold border-b text-gray-900 border-gray-100">
            <RiMailSettingsLine size={24} className="text-gray-700" />
            Account Email
          </div>
          <div className="space-y-4">
            <Input label="New Email Address" name="new_email" isImportant value={emailData.new_email} onChange={handleEmailChange} placeholder="example@gmail.com" icon={<RiMailSettingsLine size={18} className="text-gray-400" />} error={errors.new_email} />
            <Input label="Confirm with Password" name="current_password" type="password" isImportant value={emailData.current_password} onChange={handleEmailChange} placeholder="Enter current password" icon={<RiShieldFlashLine size={18} className="text-gray-400" />} error={errors.email_pass} />
            
            <button onClick={() => requestSecurityOTP('change_email')} className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary) hover:opacity-90 transition-all active:scale-95 w-full sm:w-auto cursor-pointer">
              <HiSave size={18} /> Update Email
            </button>
          </div>
        </section>

        {/* password */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 pb-2 text-lg font-bold border-b text-gray-900 border-gray-100">
            <RiFingerprintLine size={24} className="text-gray-700" />
            Security Password
          </div>
          <div className="space-y-4">
            <Input label="New Password" name="new_password" type="password" isImportant value={passData.new_password} onChange={handlePassChange} placeholder="Min. 6 characters" icon={<RiLockPasswordLine size={18} className="text-gray-400" />} error={errors.new_password} />
            <Input label="Confirm New Password" name="confirm_password" type="password" isImportant value={passData.confirm_password} onChange={handlePassChange} placeholder="Repeat new password" icon={<RiLockPasswordLine size={18} className="text-gray-400" />} error={errors.confirm_password} />

            <button onClick={() => requestSecurityOTP('change_password')} className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary) hover:opacity-90 transition-all active:scale-95 w-full sm:w-auto cursor-pointer">
              <HiSave size={18} /> Update Password
            </button>
          </div>
        </section>

        {/* personal info */}
        <section className="space-y-6 lg:pt-4 border-t border-gray-100 lg:border-none lg:pt-0">
          <div className="flex items-center gap-2 pb-2 text-lg font-bold border-b text-gray-900 border-gray-100">
            <RiUserLine size={24} className="text-gray-700" />
            Personal Information
          </div>
          <InputImage 
            label="Profile Picture" 
            name="avatar" 
            isPreview={true} 
            existingImage={profileData.currentAvatarUrl} 
            size="100px" 
            onChange={handleProfileChange} 
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First Name" name="firstName" value={profileData.firstName} onChange={handleProfileChange} placeholder="John" />
            <Input label="Last Name" name="lastName" value={profileData.lastName} onChange={handleProfileChange} placeholder="Doe" />
          </div>

          <button onClick={handleUpdateProfile} className="flex items-center justify-center gap-2 px-10 py-3 font-bold text-white text-sm rounded-lg bg-(--clr-primary) hover:opacity-90 transition-all active:scale-95 w-full sm:w-auto cursor-pointer">
            <HiSave size={18} /> Update Profile
          </button>
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