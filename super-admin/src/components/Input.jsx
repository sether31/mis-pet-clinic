import { useState } from 'react';
// icons
import { HiMiniExclamationCircle } from 'react-icons/hi2';
import { FaRegEyeSlash } from 'react-icons/fa';
import { FaRegEye } from 'react-icons/fa';


export default function Input({ label, labelStyle, id, icon, type="text", isImportant = false, isOptional = false, error, ...props }) {
  const [showPass, setShowPass] = useState(false)

  const borderColor =
    error === "valid"
      ? "border-green-500"
      : error
      ? "border-red-500"
      : "border-gray-300";

  return (
    <div className="flex flex-col w-full gap-1">
      {/* label */}
      {label && (
        <label
          htmlFor={id || undefined}
          className={`text-sm font-medium text-gray-700 ${labelStyle}`}
        >
          {label}{" "}
          {isImportant && <span className="text-red-500">*</span>}
          {isOptional && <span className="text-gray-500">(optional)</span>}
        </label>
      )}

      {/* input */}
      <div
        className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-white ${borderColor}`}
      >
        {type !== "password" ? (
          <div className='flex items-center w-full gap-2'>
            {icon && <span>{icon}</span>}
            <input 
              id={id || undefined}
              type={type} 
              className="flex-1 bg-transparent outline-none text-sm" 
              {...props} 
             />
          </div>
        ) : (
          // password
          <>
            <div className='flex items-center w-full gap-2'>
              {icon && <span>{icon}</span>}
              <input 
                id={id || undefined}
                type={showPass ? "text" : "password"} 
                className="flex-1 w-full bg-transparent outline-none text-sm" 
                {...props} 
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
        <p className="flex items-center text-xs text-red-500">
          <HiMiniExclamationCircle size={16} />
          {error}
        </p>
      )}
    </div>
  );
}