import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
// hooks
import { useUI } from '../../hooks/useUI';
import { usePlatform } from '../../hooks/usePlatform';
// utils
import { validateEmail } from '../../utils/validateEmail';
// components
import Input from '../../components/Input';
import Button from '../../components/Button';
import OTPInput from '../../components/OtpInput';
// icons
import { MdOutlineMail } from 'react-icons/md';
import { SlLock } from 'react-icons/sl';

const API_URL = import.meta.env.VITE_API_URL;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { platformData } = usePlatform();
  const { showLoader, hideLoader } = useUI();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState(null);
  
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    otp: ""
  });

  // req otp
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "", confirmPassword: "", otp: "" });

    if (!email.trim()) {
      setErrors(prev => ({ ...prev, email: "Email is required" }));
      return;
    }
    if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: "Invalid email format" }));
      return;
    }

    showLoader("Searching for account...");
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password-req.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setUserId(data.user_id);
        setStep(2);
        toast.success("Verification code sent to your email");
      } else {
        setErrors(prev => ({ ...prev, email: data.message }));
        toast.error(data.message);
      }
    } catch(err) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    }
  };

  // verify otp
  const handleOTPComplete = async (otp) => {
    showLoader('Verifying code...');
    setErrors(prev => ({ ...prev, otp: "" }));

    try {
      const res = await fetch(`${API_URL}/api/auth/verify-reset-otp.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, otp })
      });
      const data = await res.json();
      if (data.success) {
        setStep(3);
        toast.success("Identity verified. Set your new password.");
      } else {
        setErrors(prev => ({ ...prev, otp: data.message }));
        toast.error(data.message);
      }
    } catch(err) {
      toast.error("Verification failed");
    } finally {
      hideLoader();
    }
  };

  // final reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrors({ email: "", password: "", confirmPassword: "", otp: "" });

    let newErrors = {};
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Must be at least 6 characters";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    showLoader("Updating password...");
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password-final.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password updated successfully!");
        navigate("/clinic/login");
      } else {
        toast.error(data.message);
      }
    } catch(err) {
      toast.error("Update failed");
    } finally {
      hideLoader();
    }
  };

  if(!platformData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-400 animate-pulse">Loading Platform...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, type: "spring" }}
        className="w-full max-w-md p-8 bg-white border border-white shadow-sm rounded-xl"
      >
        <div className="flex items-center justify-center gap-2 mt-2 mb-6">
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

        {step === 1 && (
          <div>
            <h2 className='mb-2 text-2xl font-bold text-center text-gray-800'>Reset Password</h2>
            <p className="mb-6 text-sm text-center text-gray-500">Enter your email to receive a 6-digit verification code.</p>
            
            <form onSubmit={handleRequestOTP} className='grid gap-4'>
              <Input
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                icon={<MdOutlineMail className="text-gray-700" />}
                error={errors.email} 
              />
              <Button type="submit" variant="primary" className="w-full py-3 mt-2 cursor-pointer">
                Continue
              </Button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className='mb-2 text-2xl font-bold text-center text-gray-800'>New Password</h2>
            <p className="mb-6 text-sm text-center text-gray-500">Create a new strong password for your account.</p>
            
            <form onSubmit={handleResetPassword} className='grid gap-4'>
              <Input
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                icon={<SlLock className="text-gray-700" />}
                error={errors.password} 
              />
              <Input
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                icon={<SlLock className="text-gray-700" />}
                error={errors.confirmPassword} 
              />
              <Button type="submit" variant="primary" className="w-full py-3 mt-2 cursor-pointer">
                Update Password
              </Button>
            </form>
          </div>
        )}

        <div className="pt-6 mt-8 text-center border-t border-gray-50">
          <Link to="/clinic/login" className='text-xs font-bold text-gray-400 active:95 duration-300 ease-in-out uppercase tracking-widest hover:text-(--clr-primary)'>
            Back to Login
          </Link>
        </div>

        {step === 2 && (
          <OTPInput 
            length={6} 
            onComplete={handleOTPComplete}
            setShowOTP={() => setStep(1)}
            error={errors.otp}
          />
        )}
      </motion.div>
    </div>
  );
}