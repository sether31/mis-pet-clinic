import { useState } from "react";
import { HiMiniExclamationCircle } from "react-icons/hi2";
import noImage from '../assets/images/no-image.jpg';

export default function InputImage({
  label = "Upload Image",
  name = "image",
  required = false,
  className = "",
  size = '150px',
  isPreview = false,
  disabled= false,
  error,
  onChange,
  existingImage = null
}) {
  const [preview, setPreview] = useState(null);

  const displayImage = preview || (existingImage ? `${import.meta.env.VITE_API_URL}/${existingImage}` : noImage);

  const borderColor =
  error === "valid"
    ? "border-green-500"
    : error
    ? "border-red-500"
    : "border-gray-300";

  const handleChange = (e) => {
    if (disabled) return;
    
    const file = e.target.files[0];
    if(!file) return;

    const imageUrl = URL.createObjectURL(file);
    setPreview(imageUrl);

    if(onChange) {
      onChange({
        target: {
          name,
          type: "file",
          files: [file]
        }
      });
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      {/* preview */}
      {isPreview && (
        <div
          className="mb-2 overflow-hidden bg-gray-300 rounded-lg self-center"
          style={{ width: size, height: size }}
        >
          <a rel="noopener noreferrer">
            <img
              src={displayImage}
              alt="preview"
              className="object-cover w-full h-full rounded-lg"
            />
          </a>
        </div>
      )}

      <label className="ml-1 text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <input
        type="file"
        accept="image/*"
        name={name}
        disabled={disabled}
        onChange={handleChange}
        className={`block w-full p-2 mt-1 border border-gray-300 rounded-lg disabled:cursor-not-allowed ${borderColor}`}
      />

      {error && error !== "valid" && (
        <p className="flex items-center text-xs text-red-500">
          <HiMiniExclamationCircle size={16} /> {error}
        </p>
      )}
    </div>
  );
}
