import React, { useState } from 'react';
import { 
  RiMailSendLine, 
  RiNotificationBadgeLine, 
  RiErrorWarningLine 
} from 'react-icons/ri';
import { toast } from 'react-toastify';
import { authFetch } from '../../../../utils/authFetch';
import LoaderV2 from '../../../../components/LoaderV2';

const API_URL = import.meta.env.VITE_API_URL;

export default function Announcement() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', message: '' });
  const [errors, setErrors] = useState({});

  const getBorderClass = (field) => {
    if (errors[field]) return 'border-red-500 ring-1 ring-red-500';
    if (form[field].trim().length > 0) return 'border-green-500';
    return 'border-gray-300';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validation Logic
    const newErrors = {};
    if (!form.title.trim()) newErrors.title = "Title is required";
    if (!form.message.trim()) newErrors.message = "Message content is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required inputs correctly")
      return;
    }

    setLoading(true);
    setErrors({}); // Reset errors on valid attempt

    try {
      // 2. AuthFetch Request
      const data = await authFetch(`${API_URL}/api/super-admin/notifications/send-announcement.php`, {
        method: 'POST',
        body: JSON.stringify({ 
            ...form, 
            is_global: 1 
        }),
      }, ['super_admin']);

      // 3. Response Handling
      if (data && data.success) {
        toast.success("System announcement was sent to all users");
        setForm({ title: '', message: '' }); 
      } else {
        toast.error("Something went wrong");
      }
    } catch (err) {
      console.error("Announcement Error:", err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">

      {loading ? (
        <LoaderV2 />
      ) : (
        <div className="">
          
          {/* Header Section */}
          <div className="flex flex-col items-center gap-3 mb-8 text-center sm:text-left sm:flex-row">
            <div className="p-3 bg-blue-100 rounded-lg text-(--clr-primary)">
              <RiNotificationBadgeLine size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">System Announcement</h2>
              <p className="text-sm text-gray-500">
                This will send a notification to all active users on the platform.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title Input */}
            <div>
              <label className="block mb-2 ml-1 text-sm font-bold text-gray-700">
                Announcement Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({...form, title: e.target.value});
                  if(errors.title) setErrors({...errors, title: null});
                }}
                placeholder="ex. Scheduled Maintenance"
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all ${getBorderClass('title')}`}
              />
              {errors.title && (
                <div className="flex items-center gap-1 mt-1 text-red-500">
                  <RiErrorWarningLine size={14} />
                  <p className="text-xs font-medium">{errors.title}</p>
                </div>
              )}
            </div>

            {/* Message Content (Resizable) */}
            <div>
              <label className="block mb-2 ml-1 text-sm font-bold text-gray-700">
                Message Content <span className="text-red-500">*</span>
              </label>
              <textarea 
                rows="5"
                value={form.message}
                onChange={(e) => {
                  setForm({...form, message: e.target.value});
                  if(errors.message) setErrors({...errors, message: null});
                }}
                placeholder="Type your message here..."
                style={{ resize: 'vertical' }} 
                className={`w-full px-4 py-3 border rounded-lg outline-none transition-all min-h-[120px] ${getBorderClass('message')}`}
              />
              {errors.message && (
                <div className="flex items-center gap-1 mt-1 text-red-500">
                  <RiErrorWarningLine size={14} />
                  <p className="text-xs font-medium">{errors.message}</p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full gap-2 py-4 font-bold text-white transition-all rounded-lg bg-(--clr-primary) hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <RiMailSendLine size={20} />
              {loading ? "Processing..." : "Send Announcement"}
            </button>
            
          </form>
        </div>
      )}
    </div>
  );
}