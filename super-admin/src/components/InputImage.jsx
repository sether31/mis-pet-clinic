import { useState } from "react";
import { HiMiniExclamationCircle } from "react-icons/hi2";
import noImage from '../assets/images/no-image.jpg';

export default function InputImage({
  label = "Upload Image",
  name = "image",
  required = true,
  className = "",
  size = '150px',
  isPreview = false,
  error,
  onChange
}) {
  const [preview, setPreview] = useState(null);

  const borderColor =
  error === "valid"
    ? "border-green-500"
    : error
    ? "border-red-500"
    : "border-gray-300";

  const handleChange = (e) => {
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
          className='mb-4 overflow-hidden bg-gray-300 rounded-lg'
          style={{ width: size, height: size }}
        >
          {preview ? (
            <a href={preview} target="_blank" rel="noopener noreferrer">
              <img
                src={preview}
                alt="preview"
                className="object-cover w-full h-full rounded-lg"
              />
            </a>
          ) : (
            <a rel="noopener noreferrer">
              <img
                src={noImage}
                alt="preview"
                className="object-cover w-full h-full rounded-lg"
              />
            </a>
          )}
        </div>
      )}

      <label className="ml-1 text-base font-medium text-gray-700">
        {label} {required ? (
          <span className="text-red-500">*</span>
        ) : (
          <span className="text-gray-500">(optional)</span>
        )}
      </label>

      <input
        type="file"
        accept="image/*"
        name={name}
        onChange={handleChange}
        className={`block w-full p-2 mt-2 border border-gray-300 rounded-lg ${borderColor} cursor-pointer`}
      />

      {error && error !== "valid" && (
        <p className="flex items-center text-xs text-red-500">
          <HiMiniExclamationCircle size={16} /> {error}
        </p>
      )}
    </div>
  );
}
