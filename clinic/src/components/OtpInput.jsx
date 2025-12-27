import { useState, useRef } from "react";

// icons
import { IoIosCloseCircleOutline } from "react-icons/io";
import { HiMiniExclamationCircle } from 'react-icons/hi2';

export default function OTPInput({ length = 6, onComplete, setShowOTP, error }) {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputsRef = useRef([]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    if(/[^0-9]/.test(value)) return; 

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // move to next input
    if(value && index < length - 1) {
      inputsRef.current[index + 1].focus();
    }

    // if compete
    if(newOtp.every(d => d !== "")) {
      onComplete && onComplete(newOtp.join(""));
    }
  };

  const handleBackspace = (e, index) => {
    if(e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const closeOTP = () => {
    setShowOTP(false)
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center w-screen h-screen">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      <div className="relative bg-(--clr-bg-card) rounded-xl px-10 pb-10 pt-15 z-10 shadow-sm">
        {/* close */}
        <div className='absolute top-4 right-4 cursor-pointer text-(--clr-text-primary) hover:text-(--clr-text-header)' onClick={closeOTP}>
          <IoIosCloseCircleOutline size={30} />
        </div>
        <p className="mb-2 text-sm text-center text-gray-700">
          Please enter the 6-digit code sent to your email.
        </p>
        {/* otp */}
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleBackspace(e, index)}
              ref={(el) => (inputsRef.current[index] = el)}
              className="w-12 h-12 text-center text-xl border rounded focus:outline-none focus:ring-2 focus:ring-(--clr-primary)"
            />
          ))}
        </div>
        {/* error */}
        {error && (
          <p className="flex items-center justify-center gap-1 mt-2 text-sm text-center text-red-500">
            <HiMiniExclamationCircle size={16}/>
            {error}
          </p>
        )}
      </div>
    </div>

  );
}
