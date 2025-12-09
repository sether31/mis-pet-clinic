import { useState } from 'react';
import { Link } from 'react-router-dom'
import { delay, motion } from 'framer-motion';
// icons
import { MdOutlineMail } from 'react-icons/md';
import { SlLock } from 'react-icons/sl';
// image
import loginPic from '../../assets/images/login-pic.png';
// components
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

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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
    setLoading(true);
    
    let newErrors = {};
    if(!form.email.trim()) newErrors.email = "Email is required";
    if(!form.password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    if(Object.keys(newErrors).length > 0) {
      setLoading(false);
      return;
    } 

    try {
      const res = await fetch(`${API_URL}/api/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      console.log(data);
      if(data.success) {
        setUserId(data.user_id);
        setShowOTP(true);
      } else {
        if(data.message === "Invalid user") {
          setErrors(prev => ({ ...prev, email: data.message }));
        } else if(data.message === "Invalid password") {
          setErrors(prev => ({ ...prev, password: data.message }));
        } else {
          setErrors(prev => ({ ...prev, password: data.message }));
        }
      }
    } catch(error) {
      console.log("Fetch error:", error);
    }
    setLoading(false);
  }

  const handleOTPComplete = async (otp) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}i/api/verifyOtp.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, otp })
      });
      const data = await res.json();

      if(data.success) {
        alert("OTP verified! You are logged in.");
        setLoading(false);
      } else {
        setErrors(prev => ({ ...prev, otp: data.message }));
      }
    } catch(error) {
      console.log("OTP verify error:", error);
    }
    await wait(1000);
    setLoading(false);
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
      <div className="flex items-center min-h-screen px-0 bg-[var(--clr-primary)] container-2xl relative text-[var(--clr-secondary)]">
        {/* login */}
        <div className="grid grid-cols-1 lg:grid-cols-[.85fr_1fr] min-h-[695px] flex-1 px-4 lg:px-0">
          {/* image section */}
          <motion.section 
            className="h-full bg-[var(--clr-dark-green)] relative hidden lg:block overflow-hidden"
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
              <motion.h1 variants={formItemVariants} className='mb-4 text-4xl font-bold text-[var(--clr-dark-green)]'>Login in to your Account</motion.h1>

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
                <Link to="/register" className='underline text-[var(--clr-dark-green)] hover:opacity-75'>Sign up</Link>
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

      {loading && (
        <FullScreenLoader />
      )}
    </>
  )
}
