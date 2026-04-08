import { useState } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import Input from '../../../../components/Input'; 
// icons 
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function FAQModal({ initialData, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    accordion_id: initialData?.accordion_id || null,
    question: initialData?.question || '',
    answer: initialData?.answer || '',
    sort_order: initialData?.sort_order || 0,
    status: initialData?.is_active ?? 1 
  });

  // Dynamic Error Handling on Change
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'sort_order' && value < 0) return;

    setForm(prev => ({ ...prev, [name]: value }));

    // Validation Logic
    if (name === 'question') {
      setErrors(prev => ({ 
        ...prev, 
        question: value.trim().length < 5 ? "Question is too short (min 5)." : "valid" 
      }));
    }
    if (name === 'answer') {
      setErrors(prev => ({ 
        ...prev, 
        answer: value.trim() ? "valid" : "The answer content is required." 
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation
    const localErrors = {
      question: form.question.trim().length < 5 ? "Question is too short. (at least 5)" : "valid",
      answer: form.answer.trim() ? "valid" : "Answer is required.",
      // Ensure sort_order is not empty and is positive
      sort_order: form.sort_order <= 0 ? "Order must be 1 or higher." : "valid"
    };

    setErrors(localErrors);
    if (Object.values(localErrors).some(val => val !== "valid")) {
      return toast.error("Please fill in all required fields correctly.");
    }

    setIsSubmitting(true);
    // Use showLoader to block UI during the save, similar to GeneralSettings
    showLoader(); 

    try {
      // 2. DYNAMIC ENDPOINT SELECTION
      // Based on your split logic, choose the specific file
      const endpoint = initialData 
        ? `${API_URL}/api/super-admin/platform-settings/faq/update-accordion.php` 
        : `${API_URL}/api/super-admin/platform-settings/faq/create-accordion.php`;

      const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(form)
      });

      if (res.success) {
        toast.success(res.message || "Saved successfully");
        onRefresh();
        onClose();
      } else {
        toast.error(res.message || "Something went wrong");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-100 bg-black/60 backdrop-blur-sm font-sans">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {initialData ? 'Update FAQ' : 'Create FAQ'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Landing Page FAQ
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left">
          <Input
            label="Question"
            name="question"
            value={form.question}
            isImportant={true}
            placeholder="ex. How do I register my clinic??"
            onChange={handleChange}
            error={errors.question}
          />

          <div className="flex flex-col gap-1">
            <label className="ml-1 text-sm font-medium text-gray-700">
              Answer <span className="text-red-500">*</span>
            </label>
            <textarea
              name="answer"
              rows="4"
              className={`w-full p-3 text-sm border rounded-xl outline-none transition-all resize-none bg-gray-50 focus:bg-white 
                ${errors.answer && errors.answer !== 'valid' ? 'border-red-500' : 'border-gray-200 focus:border-black'}`}
              placeholder="Provide a helpful answer..."
              value={form.answer}
              onChange={handleChange}
            />
            {errors.answer && errors.answer !== "valid" && (
              <span className="flex items-center gap-0.5 text-[11px] font-medium text-red-500 mt-1">
                <HiMiniExclamationCircle size={14} />
                {errors.answer}
              </span>
            )}
          </div>

          <Input
            label="Sort Order"
            name="sort_order"
            type="number"
            min="1"
            value={form.sort_order}
            placeholder="0"
            onChange={handleChange}
          />

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 mt-2 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) cursor-pointer rounded-xl hover:opacity-90 disabled:opacity-50 active:scale-95"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Processing..." : "Save FAQ Details"}
          </button>
        </form>
      </div>
    </div>
  );
}