import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { delay, motion } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// icons
import { MdOutlineMail } from 'react-icons/md';
import { SlLock } from 'react-icons/sl';
// image
import loginPic from '../../assets/images/login-pic.png';
// components
import { validRoleToken } from '../../utils/validRoleToken';
import getDashboardByRole from '../../utils/getDashboardByRole';
import ValidateEmail from '../../components/ValidateEmail'
import Input from '../../components/Input';
import Button from '../../components/Button';
import OTPInput from '../../components/OtpInput';
import FullScreenLoader from '../../components/FullLoader';
import wait from '../../utils/wait';


const API_URL = import.meta.env.VITE_API_URL;

export default function Login() {
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
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const navigate = useNavigate();

  useEffect(() => {
    const checkToken = async () => {
      try {
        const user = validRoleToken();
        if(!user) return;

        const { role, status } = user;

        if(!getDashboardByRole(role)) {
          localStorage.clear();
          return;
        }

        setLoading(true);
        setLoadingMessage('Redirecting...')
        await wait(2000);

        if(role === 'clinic_admin' && status === 'pending') {
          navigate('/pendingUser', { replace: true });
        } else {
          navigate(getDashboardByRole(role), { replace: true });
        }
      } finally {
        setLoading(false); 
      }
    };

    checkToken();
  }, []);

  // handle input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if(name === "email") {
      if(!value.trim()) {
        setErrors(prev => ({ ...prev, email: null })); 
      } else if(!ValidateEmail(value)) {
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
    setLoading(true);
    setLoadingMessage('Loading...');

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
      setLoading(false);
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
        } else if(data.message === "Invalid password") {
          setErrors({ password: data.message });
        }
        toast.error(data.message);
        setLoading(false);
        return;
      }

      setUserId(data.user_id);
      setShowOTP(true);
      toast.success(data.message);
    } catch(error) {
      console.log("Fetch error:", error);
      toast.error("Something went wrong");
    } finally{
      setLoading(false);
    }
  }

  const handleOTPComplete = async (otp) => {
    setLoading(true);
    setLoadingMessage('Verifying OTP...');

    try {
      const res = await fetch(`${API_URL}/api/auth/loginOtp.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, otp })
      });
      const data = await res.json();

      if(!data.success) {
        setErrors(prev => ({ ...prev, otp: data.message }));
        setLoading(false);
        toast.error(data.message);
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      toast.success(data.message);
      await wait(2000);
      setShowOTP(false);

      const { role, status } = validRoleToken();

      if(role === "clinic_admin" && status === "pending") {
        navigate("/pendingUser", { replace: true });
      } else {
        navigate(getDashboardByRole(role), { replace: true });
      }
    } catch(error) {
      console.log("OTP verify error:", error);
      toast.error('Something went wrong');
    } finally{
      setLoading(false);
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
  

  return (
    <>
      <div className="relative flex items-center min-h-screen px-0 container-2xl">
        {/* login */}
        <div className="grid grid-cols-1 lg:grid-cols-[.85fr_1fr] min-h-[695px] flex-1 px-4 lg:px-0">
          {/* image section */}
          <motion.section 
            className="h-full bg-[var(--clr-primary)] relative hidden lg:block overflow-hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.img 
              src={loginPic} 
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
              <motion.h1 variants={formItemVariants} className='mb-4 text-xl font-medium'>LOGO</motion.h1>
              <motion.h1 variants={formItemVariants} className='mb-4 text-4xl font-bold text-[var(--clr-text-header)]'>Login in to your Account</motion.h1>

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
                    load={loading}
                  >
                    Login
                  </Button>
                </motion.div>
              </form>

              <motion.p variants={formItemVariants}>
                <Link to="/forgotPassword" className="text-base font-[500] text-gray-700 hover:text-gray-600 mt-2 text-right block">
                  Forgot Password?
                </Link>
              </motion.p>


              <motion.div variants={formItemVariants} className="flex items-center w-full gap-2 my-8">
                <div className="flex-1 h-[1px] bg-gray-500"></div>
                <p className="text-sm">OR</p>
                <div className="flex-1 h-[1px] bg-gray-500"></div>
              </motion.div>

              <motion.p variants={formItemVariants} className='flex justify-center gap-1 text-base'>
                Dont have an account? 
                <Link to="/register" className='underline text-[var(--clr-text-header)] hover:opacity-75'>Sign up</Link>
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

      <ToastContainer position="top-right" autoClose={3000} />

      {loading && (
        <FullScreenLoader message={loadingMessage} />
      )}
    </>
  )
}
