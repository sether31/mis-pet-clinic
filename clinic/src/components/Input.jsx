import { useState } from 'react';

// icons
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { FaRegEyeSlash } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa';


export default function Input({ icon, type="text", error, ...props }) {
  const [showPass, setShowPass] = useState(false)

  const borderColor =
    error === "valid"
      ? "border-green-500"
      : error
      ? "border-red-500"
      : "border-gray-300";

  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-white ${borderColor}`}
      >
        {type !== "password" ? (
          <div className='flex items-center gap-2 w-full'>
            {icon && <span>{icon}</span>}
            <input type={type} {...props} className="flex-1 bg-transparent outline-none" />
          </div>
        ) : (
          // password
          <>
            <div className='flex items-center gap-2 w-full'>
              {icon && <span>{icon}</span>}
              <input 
                type={showPass ? "text" : "password"} 
                {...props} 
                className="flex-1 bg-transparent outline-none w-full" 
              />
            </div>
            
            <div className='cursor-pointer' onClick={() => setShowPass(prev => !prev)}>
              {!showPass ? 
                <FaRegEyeSlash size={16} /> :
                <FaRegEye size={16} />  
              }
            </div>
          </>
        )}
      </div>

      {error && error !== "valid" && (
        <p className="flex items-center text-sm text-red-500">
          <HiMiniExclamationCircle size={16} />
          {error}
        </p>
      )}
    </div>
  );
}
