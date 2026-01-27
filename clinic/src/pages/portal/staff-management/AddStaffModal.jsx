import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
import { validateEmail } from '../../../utils/validateEmail';
// components
import Input from '../../../components/Input'; 
import InputImage from '../../../components/InputImage';
// icons
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function AddStaffModal({ initialData, onClose, onRefresh, branchId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const userRoles = [
    { id: 3, label: 'Branch Manager' },
    { id: 4, label: 'Veterinarian' },
    { id: 5, label: 'Groomer' },
    { id: 6, label: 'Support Staff' }
  ];

  const inputLabels = {
    fname: "First Name",
    lname: "Last Name",
    email: "Email Address",
    password: "Password",
    role: "Staff Role",
    permissions: "Access Permissions",
    profile_pic: "Profile Picture"
  };

  const availablePermissions = [
    { id: "role_dashboard", label: "Role Dashboard"},
    { id: "appointment_management", label: "Appointment Management"},
    { id: "staff_management", label: "Staff Management"}
  ];

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const [form, setForm] = useState({
    user_id: initialData?.user_id || null,
    fname: initialData?.fname || '',
    lname: initialData?.lname || '',
    email: initialData?.email || '',
    password: '',
    role_id: initialData?.role_id || 5,
    permissions: initialData?.permissions || [],
    profile_pic: null, 
    is_active: initialData ? Number(initialData.status) : 1,
    schedule: initialData?.schedule && Object.keys(initialData.schedule).length > 0 
      ? initialData.schedule 
      : daysOfWeek.reduce((acc, day) => ({
        ...acc,
        [day]: { is_workday: true, start: "09:00", end: "18:00" }
      }), {})
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target || { 
      name: 'profile_pic', 
      value: e, 
      type: (e instanceof File || typeof e === 'string') ? 'file' : 'text' 
    };

    const updatedValue = type === "checkbox" ? checked : type === "file" ? (files ? files[0] : value) : value;

    setForm(prev => ({ ...prev, [name]: updatedValue }));


    if(name === "password") {
      if(!updatedValue && !form.user_id) {
        setErrors(prev => ({ ...prev, password: "Password is required." }));
      } else if(updatedValue && updatedValue.length < 6) {
        setErrors(prev => ({ ...prev, password: "Password must be at least 6 characters." }));
      } else {
        setErrors(prev => ({ ...prev, password: "valid" }));
      }
      return;
    }

    if(name === "permissions") {
      const selected = [...form.permissions];
      const index = selected.indexOf(value);
      if(index === -1) selected.push(value); 
      else selected.splice(index, 1); 

      setForm(prev => ({ ...prev, permissions: selected }));
      setErrors(prev => ({
        ...prev,
        permissions: selected.length === 0 ? "Select at least one permission." : "valid"
      }));
      return;
    }

    if(!updatedValue?.toString().trim()) {
      setErrors(prev => ({ ...prev, [name]: `${inputLabels[name]} is required.` }));
    } else {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
    }
  };

  const handleScheduleChange = (day, field, value) => {
    setForm(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: { ...prev.schedule[day], [field]: value }
      }
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const required = ["fname", "lname", "email"];
    
    required.forEach(field => {
      if(!form[field] || !form[field].toString().trim()) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    if(!form.user_id) {
      if(!form.password) newErrors.password = "Password is required.";
      else if(form.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    } else if(form.password && form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    if(form.email && !validateEmail(form.email)) newErrors.email = "Invalid email.";
    if(form.permissions.length === 0) newErrors.permissions = "Select at least one permission.";
    
    // only require image if there is no existing image
    if(!initialData?.profile_pic && !form.profile_pic) {
      newErrors.profile_pic = "Profile picture is required.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if(Object.keys(validationErrors).length > 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    
    Object.keys(form).forEach(key => {
      if(key === 'permissions' || key === 'schedule') {
        fd.append(key, JSON.stringify(form[key]));
      } else if(key === 'profile_pic') {
        if(form[key]) fd.append(key, form[key]);
      } else if(form[key] !== null) {
        fd.append(key, form[key]);
      }
    });
    
    fd.append('branch_id', branchId);
    fd.append('status', form.is_active);

    try {
      const endpoint = form.user_id ? 'update-staff.php' : 'create-staff.php';
      const response = await authFetch(`${API_URL}/api/clinic/general/staff/${endpoint}`, {
        method: 'POST',
        body: fd
      });
      
      if(response.success) {
        toast.success(response.message || "Saved successfully");
        onRefresh();
        onClose();
      } else {
        console.log("error: ", toast.message)
        toast.error("Something went wrong");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {form.user_id ? 'Edit Staff Member' : 'Add New Staff'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {form.user_id ? 'Manage' : 'Create'} staff account
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[80vh]">
          <InputImage
            label="Profile Picture"
            name="profile_pic"
            isPreview={true}
            required={!initialData?.profile_pic}
            value={form.profile_pic}
            onChange={handleChange}
            error={errors.profile_pic}
            existingImage={initialData?.profile_pic} 
          />

          <div className="grid grid-cols-2 gap-4">
            <Input value={form.fname} label="First Name" name="fname" isImportant onChange={handleChange} error={errors.fname} placeHolder="Enter first name" />
            <Input value={form.lname} label="Last Name" name="lname" isImportant onChange={handleChange} error={errors.lname} placeHolder="Enter last name" />
          </div>

          <Input value={form.email} label="Email Address" name="email" isImportant onChange={handleChange} error={errors.email} placeHolder="staff@gmail.com" />

          <Input 
            value={form.password} 
            type="password" 
            label={form.user_id ? "Change Password (Optional)" : "Password"} 
            name="password" 
            isImportant={!form.user_id} 
            onChange={handleChange} 
            error={errors.password} 
            placeHolder="Enter at least 6 characters"
          />

          <div className="space-y-1">
            <label className="ml-1 text-sm font-medium text-gray-700">Role <span className="text-red-500">*</span></label>
            <select 
              name="role_id"
              className={`w-full p-2 border rounded-lg outline-none bg-white transition-all cursor-pointer ${errors.role_id === 'valid' ? 'border-green-500' : 'border-gray-300'}`}
              value={form.role_id}
              onChange={handleChange}
            >
              {userRoles.map((role) => (
                <option key={role.id} value={role.id}>{role.label}</option>
              ))}
            </select>
          </div>


          <div className="relative pt-2">
            <h1 className='mb-2 ml-1 text-sm font-medium text-gray-700'>
              Access Permissions <span className="text-red-500">*</span>
            </h1>

            <div 
              className={`min-h-[45px] p-2 border rounded-lg cursor-pointer flex flex-wrap gap-2 bg-white transition-all ${
                errors.permissions === "valid" ? "border-green-500" : "border-gray-300"
              }`}
              onClick={() => document.getElementById('permissions-list').classList.toggle('hidden')}
            >
              {form.permissions.length === 0 && <span className="py-1 ml-2 text-gray-400">Select permissions...</span>}
              {form.permissions.map(selectedId => {
                const permDetail = availablePermissions.find(p => p.id === selectedId);
                return (
                  <span key={selectedId} className="px-3 py-1 bg-(--clr-primary) text-white text-[11px] font-bold rounded-full flex items-center gap-2 uppercase">
                    {permDetail ? permDetail.label : "..."}
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleChange({ target: { name: 'permissions', value: selectedId } }); }} className="hover:text-red-200">×</button>
                  </span>
                );
              })}
            </div>

            <div id="permissions-list" className="absolute z-10 hidden w-full mt-1 overflow-y-auto bg-white border border-gray-300 rounded-lg max-h-60" onMouseLeave={() => document.getElementById('permissions-list').classList.add('hidden')}>
              {availablePermissions.map(perm => (
                <div key={perm.id} onClick={() => handleChange({ target: { name: 'permissions', value: perm.id } })} className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 flex justify-between items-center ${form.permissions.includes(perm.id) ? "bg-gray-50 font-bold" : ""}`}>
                  <p>{perm.label}</p>
                  {form.permissions.includes(perm.id) && <span className="text-(--clr-primary)">✓</span>}
                </div>
              ))}
            </div>
            {errors.permissions && errors.permissions !== "valid" && <p className="flex items-center mt-1 text-xs text-red-500"><HiMiniExclamationCircle size={16} />{errors.permissions}</p>}
          </div>

          <div className="pt-2">
            <h1 className='mb-2 ml-1 text-sm font-medium text-gray-700'>
              Working Schedule
            </h1>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              {daysOfWeek.map(day => (
                <div key={day} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 w-24">
                    <input 
                      type="checkbox" 
                      checked={form.schedule[day]?.is_workday}
                      onChange={(e) => handleScheduleChange(day, 'is_workday', e.target.checked)}
                      className="cursor-pointer accent-(--clr-primary)"
                    />
                    <span className={`font-bold uppercase ${form.schedule[day]?.is_workday ? 'text-gray-800' : 'text-gray-300'}`}>{day.slice(0,3)}</span>
                  </div>
                  
                  {form.schedule[day]?.is_workday ? (
                    <div className="flex items-center gap-2">
                      <input type="time" value={form.schedule[day].start} onChange={(e) => handleScheduleChange(day, 'start', e.target.value)} className="p-1 border rounded outline-none" />
                      <span className="text-gray-400 font-bold">TO</span>
                      <input type="time" value={form.schedule[day].end} onChange={(e) => handleScheduleChange(day, 'end', e.target.value)} className="p-1 border rounded outline-none" />
                    </div>
                  ) : (
                    <span className="font-bold text-red-400 uppercase tracking-widest">Day Off</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) cursor-pointer rounded-xl hover:bg-(--clr-primary)/95 disabled:opacity-50">
            <HiSave size={18}/> {isSubmitting ? "Saving..." : "Save Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}