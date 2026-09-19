import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useGoogleLogin } from "@react-oauth/google"
// hooks
import { useUI } from '../../hooks/useUI';
import { useUser } from '../../hooks/useUser';
import { usePlatform } from '../../hooks/usePlatform';
// utils
import { validateEmail } from '../../utils/validateEmail'
import { validRoleToken } from '../../utils/validRoleToken';
import wait from '../../utils/wait';
// components
import Input from '../../components/Input';
import Button from '../../components/Button';
import OTPInput from '../../components/OtpInput';
// image
import loginPic from '../../assets/images/login-pic.png';
// icons
import { MdOutlineMail } from 'react-icons/md';
import { SlLock } from 'react-icons/sl';
import { FcGoogle } from "react-icons/fc";

const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { platformData } = usePlatform();
  const { showLoader, hideLoader } = useUI();
  const [form, setForm] = useState({
    email: "",
    password: "",
    platform: "web"
  });
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    otp: ""
  });
  const [showOTP, setShowOTP] = useState(false); 
  const [userId, setUserId] = useState(null); 

  useEffect(() => {
    const checkToken = async () => {
      try {
        const user = validRoleToken();
        if(!user) return;

        const { role, status, branch_id } = user;

        showLoader("Logging in...");
        await wait(2000);

        if(role === 'clinic_admin') {
          // check if admin is pending
          if(status === 'pending' || status === 'rejected') {
            navigate('/clinic/pending-user', { replace: true });
          } else {
            navigate('/clinic/select-branch', { replace: true });
          }
        } else {
          // staff redirection
          if(branch_id) {
            navigate(`/clinic/${branch_id}/portal/dashboard`, { replace: true });
          } else {
            sessionStorage.clear();
            toast.error("Access denied: No branch assigned to this account.");
          }
        }
      } finally {
        hideLoader();
      }
    };

    checkToken();
  }, [navigate]);

  // handle input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if(name === "email") {
      if(!value.trim()) {
        setErrors(prev => ({ ...prev, email: null })); 
      } else if(!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: "Invalid email" }));
      } else {
        setErrors(prev => ({ ...prev, email: "valid" })); 
      }
    }

    if(name === "password") {
      if(!value.trim()) {
        setErrors(prev => ({ ...prev, password: null })); 
      } else {
        setErrors(prev => ({ ...prev, password: "valid" })); 
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showLoader();

    setErrors({ email: "", password: ""});
    
    let newErrors = {};
    if(!form.email.trim()){
      newErrors.email = "Email is required";
      toast.error(newErrors.email);
    }
    if(!form.password.trim()) {
      newErrors.password = "Password is required";
      toast.error(newErrors.password);
    }
    setErrors(newErrors);
    if(Object.keys(newErrors).length > 0) {
      hideLoader();
      return;
    } 

    try {
      const res = await fetch(`${API_URL}/api/auth/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if(!data.success) {
        if(data.message === "Invalid user") {
          setErrors({ email: data.message });
        } else if(data.message === "Incorrect password") {
          setErrors({ password: data.message });
        }
        toast.error(data.message);
        hideLoader();
        return;
      }

      setUserId(data.user_id);
      hideLoader();
      setShowOTP(true);
      toast.success(data.message);
    } catch(error) {
      console.log("Fetch error:", error);
      toast.error("Something went wrong");
    } finally{
      hideLoader();
    }
  }

  const handleOTPComplete = async (otp) => {
    showLoader('Verifying OTP...');

    try {
      const res = await fetch(`${API_URL}/api/auth/login-otp.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, otp })
      });
      const data = await res.json();

      if(!data.success) {
        setErrors(prev => ({ ...prev, otp: data.message }));
        hideLoader();
        toast.error(data.message);
        return;
      }

      sessionStorage.setItem("access_token", data.access_token);
      const decoded = jwtDecode(data.access_token);
      setUser(decoded);
      toast.success(data.message);
      await wait(1000);
      setShowOTP(false);

      const { role, status, branch_id } = decoded;

      if(role === "clinic_admin") {
        // check if admin is pending
        if(status === "pending") {
          navigate("/clinic/pending-user", { replace: true });
        } else {
          navigate("/clinic/select-branch", { replace: true });
        }
      } else {
        // staff redirection
        if(branch_id) {
          navigate(`/clinic/${branch_id}/portal/dashboard`, { replace: true });
        } else {
          toast.error("Access denied: No branch assigned to this account.");
          navigate("/clinic/login");
        }
      }
    } catch(error) {
      console.log("OTP verify error:", error);
      toast.error(error.message || 'Something went wrong');
    } finally{
      hideLoader();
    }
  };


  const formVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15, 
      },
    },
  };

  const formItemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100 } },
  };


  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      showLoader('Verifying Google Login...');

      try {
        const res = await fetch(`${API_URL}/api/auth/google-login-clinic.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeResponse.code })
        });
        
        const data = await res.json();

        if (!data.success) {
          hideLoader();
          toast.error(data.message || 'Google login failed');
          return;
        }

        sessionStorage.setItem("access_token", data.access_token);
        const decoded = jwtDecode(data.access_token);
        setUser(decoded);
        toast.success(data.message);
        
        const { role, status, branch_id } = decoded;

        if (role === "clinic_admin") {
          if (status === "pending") {
            navigate("/clinic/pending-user", { replace: true });
          } else {
            navigate("/clinic/select-branch", { replace: true });
          }
        } else {
          if (branch_id) {
            navigate(`/clinic/${branch_id}/portal/dashboard`, { replace: true });
          } else {
            toast.error("Access denied: No branch assigned to this account.");
            navigate("/clinic/login");
          }
        }

      } catch (error) {
        console.log('Failed to login google: ', error);
        toast.error(error.message || 'Something went wrong with Google Login');
      } finally {
        hideLoader();
      }
    },
    onError: (error) => {
      console.error("Google Login Hook Error:", error);
      toast.error('Google login popup closed or failed');
    }
  });

  return (
    <>
      <div className="relative flex items-center min-h-screen px-0 bg-gray-50 container-2xl">
        {/* login */}
        <div className="grid grid-cols-1 lg:grid-cols-[.85fr_1fr] min-h-[729px] flex-1 px-4 lg:px-0">
          {/* image section */}
          <motion.section 
            className="h-full bg-(--clr-primary) relative hidden lg:block overflow-hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.img 
              src={platformData?.login_photo ? `${API_URL}/${platformData.login_photo}` : loginPic} 
              alt="login picture 2 dogs" 
              className='absolute h-[95%] w-full rounded-xl bottom-0 right-0 object-cover'
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 1.25 }}
            />
          </motion.section>
          
          {/* form section */}
          <section className="flex justify-center h-[calc(100% - 100px)] mt-25">
            <motion.div
              variants={formVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={formItemVariants} className="flex items-center gap-1 my-2">
                {platformData?.platform_logo && (
                  <img 
                    src={`${API_URL}/${platformData.platform_logo}`} 
                    alt="Logo" 
                    className="object-contain w-auto h-8 rounded-sm"
                    onError={(e) => (e.target.style.display = 'none')} 
                  />
                )}
                
                <h1 className="text-2xl font-bold text-(--clr-text-header) tracking-tight">
                  {platformData?.platform_name || "LOGO"}
                </h1>
              </motion.div>

              <motion.h1 variants={formItemVariants} className='mb-4 text-4xl font-bold text-(--clr-text-header)'>Login in to your Account</motion.h1>

              <motion.p variants={formItemVariants} className="mb-6 text-gray-600">
                Welcome back! Please enter your credentials to continue.
              </motion.p>
              
              <form 
                onSubmit={handleSubmit}
                className='grid gap-4'
                variants={formItemVariants}
              >
                <motion.div variants={formItemVariants}>
                  <Input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    icon={<MdOutlineMail className="text-gray-700" />}
                    error={errors.email}
                  />
                </motion.div>
      
                <motion.div variants={formItemVariants}>
                  <Input
                    name="password"
                    value={form.password}
                    type='password'
                    onChange={handleChange}
                    placeholder="Enter your password"
                    icon={<SlLock className="text-gray-700" />}
                    error={errors.password}
                  />
                </motion.div>

                <motion.div variants={formItemVariants}>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="w-full mt-4 cursor-pointer"
                  >
                    Login
                  </Button>
                </motion.div>
              </form>

              <motion.p className="block mt-2 ml-auto w-max" variants={formItemVariants}>
                <Link to="/clinic/forgot-password" className="mt-2 text-sm text-(--clr-text-header) active:scale-95 ">
                  Forgot Password?
                </Link>
              </motion.p>

            <motion.div variants={formItemVariants} className="flex items-center gap-4 my-4 text-sm">
              <span className="flex-1 h-[1px] bg-gray-200"></span>
              <span>Or Sign In With</span>
              <span className="flex-1 h-[1px] bg-gray-200"></span>
            </motion.div>

            <motion.div variants={formItemVariants}>
              <button 
                onClick={() => handleGoogleLogin()}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm duration-300 ease-in-out bg-white border border-gray-300 rounded-md cursor-pointer active:scale-95 hover:bg-black/5"
              >
                <FcGoogle />
                <span>Continue with Google</span>
              </button>
            </motion.div>

            
            <motion.p variants={formItemVariants} className="flex justify-center gap-1 my-2 text-sm">
              <span>Don't have an account?</span> 
              <Link to="/clinic/register" className="duration-300 ease-in-out active:scale-95 text-(--clr-text-header)">Sign up</Link>
            </motion.p>
            </motion.div>
          </section>
        </div>
      </div>

      {/* otp */}
      {showOTP && (
        <OTPInput 
          length={6} 
          onComplete={handleOTPComplete}
          setShowOTP={setShowOTP}
          error={errors.otp} 
        />
      )}
    </>
  )
}
