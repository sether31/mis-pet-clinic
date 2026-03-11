import { useState, useEffect, useRef } from 'react';
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

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AddStaffModal({ initialData, branchSchedule = [], onClose, onRefresh, branchId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [showPermissions, setShowPermissions] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  const permissionRef = useRef(null);
  const roleRef = useRef(null);
  const hasSynced = useRef(false);

  const userRoles = [
    { id: 3, label: 'Branch Manager' },
    { id: 4, label: 'Veterinarian' },
    { id: 5, label: 'Groomer' },
    { id: 6, label: 'Support Staff' }
  ];

  const availablePermissions = [
    { id: "role_dashboard", label: "Role Dashboard"},
    { id: "appointment_management", label: "Appointment Management"},
    { id: "shop_management", label: "Shop Management"},
    { id: "staff_management", label: "Staff Management"},
    { id: "transaction_management", label: "Transaction Management"},
    { id: "inventory_management", label: "Inventory Management"},
    { id: "service_management", label: "Service Management"},
    { id: "branch_settings", label: "Branch Settings"},
  ];

  const defaultRolePermissions = {
    3: ["role_dashboard", "appointment_management", "shop_reservation", "staff_management", "transaction_management", "inventory_management", "service_management", "branch_settings"],
    4: ["role_dashboard", "appointment_management", "transaction_management"], 
    5: ["role_dashboard", "appointment_management", "transaction_management"], 
    6: ["role_dashboard", "appointment_management", "shop_reservation", "transaction_management"] 
  };

  const format12h = (timeStr) => {
    if (!timeStr) return "";
    const [hours, minutes] = timeStr.split(':');
    let h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${ampm}`;
  };

  const [form, setForm] = useState({
    user_id: initialData?.user_id || null,
    fname: initialData?.fname || '',
    lname: initialData?.lname || '',
    email: initialData?.email || '',
    password: '',
    role_id: initialData?.role_id || 4,
    permissions: initialData?.permissions || defaultRolePermissions[initialData?.role_id || 4] || [],
    profile_pic: null, 
    is_active: initialData ? Number(initialData.status) : 1,
    schedule: initialData?.schedule && Object.keys(initialData.schedule).length > 0 
      ? initialData.schedule 
      : daysOfWeek.reduce((acc, day) => ({
        ...acc,
        [day]: { is_workday: true, start: null, end: null }
      }), {})
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if(permissionRef.current && !permissionRef.current.contains(event.target)) setShowPermissions(false);
      if(roleRef.current && !roleRef.current.contains(event.target)) setShowRoleDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // run if no initial data and permissions are empty
    if (!initialData && form.permissions.length === 0) {
      setForm(prev => ({
        ...prev,
        permissions: defaultRolePermissions[prev.role_id] || []
      }));
    }
  }, [initialData]);

  // force is_workday to false if branch is closed
  useEffect(() => {
    if(branchSchedule && branchSchedule.length > 0) {
      setForm(prev => {
        const updatedSchedule = { ...prev.schedule };
        let hasChanged = false;

        daysOfWeek.forEach(day => {
          const bDay = branchSchedule.find(b => b.day_of_week === day);
          const isBranchClosed = bDay ? Number(bDay.is_closed) === 1 : false;

          // if new staff sync with branch hours
          if(!initialData && !hasSynced.current) {
            updatedSchedule[day] = {
              is_workday: !isBranchClosed,
              start: bDay?.start_time ? bDay.start_time.substring(0, 5) : "09:00",
              end: bDay?.end_time ? bDay.end_time.substring(0, 5) : "18:00"
            };
            hasChanged = true;
          } 
          // if update only force 'Off Duty' if the branch is closed
          else if(isBranchClosed && updatedSchedule[day].is_workday) {
            updatedSchedule[day].is_workday = false;
            hasChanged = true;
          }
        });

        if (!initialData) hasSynced.current = true;
        return hasChanged ? { ...prev, schedule: updatedSchedule } : prev;
      });
    }
  }, [branchSchedule, initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target || { 
      name: 'profile_pic', 
      value: e, 
      type: (e instanceof File || typeof e === 'string') ? 'file' : 'text' 
    };
    const updatedValue = type === "checkbox" ? checked : type === "file" ? (files ? files[0] : value) : value;

    if (type !== "checkbox" && type !== "file") {
      if (!updatedValue.trim()) {
        const friendlyName = name === 'fname' ? 'First Name' : name === 'lname' ? 'Last Name' : 'Email';
        setErrors(prev => ({ ...prev, [name]: `${friendlyName} is required.` }));
      } else if (name === 'email' && !validateEmail(updatedValue)) {
        setErrors(prev => ({ ...prev, [name]: "Invalid email format." }));
      } else {
        setErrors(prev => ({ ...prev, [name]: "valid" }));
      }
    }

    if(name === "permissions") {
      const selected = [...form.permissions];
      const index = selected.indexOf(value);
      if(index === -1) selected.push(value); 
      else selected.splice(index, 1); 
      setForm(prev => ({ ...prev, permissions: selected }));
      setErrors(prev => ({ ...prev, permissions: selected.length === 0 ? "Please select at least one permission." : "valid" }));
      return;
    }

    if(name === "password") {
      setErrors(prev => ({ ...prev, password: updatedValue.length > 0 && updatedValue.length < 6 ? "Password must be at least 6 characters." : "valid" }));
    }

    setForm(prev => ({ ...prev, [name]: updatedValue }));
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

  const checkScheduleConflicts = () => {
    for(const day of daysOfWeek) {
      const staffDay = form.schedule[day];
      const bDay = branchSchedule?.find(b => b.day_of_week === day);
      if(bDay) {
        const isBranchClosed = Number(bDay.is_closed) === 1;
        // hh:mm format
        const sStart = (staffDay.start || "").substring(0, 5);
        const sEnd = (staffDay.end || "").substring(0, 5);
        const bStart = (bDay.start_time || "").substring(0, 5);
        const bEnd = (bDay.end_time || "").substring(0, 5);

        if(staffDay.is_workday) {
          // branch close but staff is on duty
          if(isBranchClosed) return true; 
          // outside hours
          if(sStart < bStart || sEnd > bEnd) return true; 
        }
      }
    }
    return false;
  };

  const validateForm = () => {
    const newErrors = {};
    if(!form.fname.trim()) newErrors.fname = "First Name is required.";
    if(!form.lname.trim()) newErrors.lname = "Last Name is required.";
    if(!form.email.trim()) newErrors.email = "Email Address is required.";
    else if(!validateEmail(form.email)) newErrors.email = "Invalid email.";
    if(!form.user_id && !form.password) newErrors.password = "Password is required.";
    else if(form.password && form.password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if(form.permissions.length === 0) newErrors.permissions = "Please select at least one permission.";
    if(!initialData?.profile_pic && !form.profile_pic) newErrors.profile_pic = "Profile picture is required.";
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    const hasConflict = checkScheduleConflicts();

    setErrors(validationErrors);
    if(Object.keys(validationErrors).length > 0) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    if(hasConflict) {
      toast.error("Please fix the date/time conflict.");
      return; 
    }

    setIsSubmitting(true);
    const fd = new FormData();
    Object.keys(form).forEach(key => {
      if(key === 'permissions' || key === 'schedule') fd.append(key, JSON.stringify(form[key]));
      else if(key === 'profile_pic') { if(form[key]) fd.append(key, form[key]); }
      else if(form[key] !== null) fd.append(key, form[key]);
    });
    fd.append('branch_id', branchId);
    fd.append('status', form.is_active);

    try {
      const endpoint = form.user_id ? 'update-staff.php' : 'create-staff.php';
      const response = await authFetch(`${API_URL}/api/clinic/general/staff/${endpoint}`, { method: 'POST', body: fd });
      if(response.success) {
        toast.success("Saved successfully");
        onRefresh(); onClose();
      } else {
        if (response.message?.toLowerCase().includes("email")) {
          setErrors(prev => ({ ...prev, email: "This email is already registered." }));
          toast.error("Email address is already in use.");
        } else {
          toast.error("Something went wrong");
        }
      }
    } catch(error) { toast.error("Something went wrong"); }
    finally { setIsSubmitting(false); }
  };

  const getPermissionBorder = () => {
    if (errors.permissions === "valid") return "border-green-500";
    if (errors.permissions && errors.permissions !== "valid") return "border-red-500";
    return "border-gray-300 focus-within:border-black";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white rounded-2xl">
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {form.user_id ? 'Edit Staff Member' : 'Add New Staff'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Manage staff account
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* picture */}
          <InputImage label="Profile Picture" name="profile_pic" isPreview={true} required={!initialData?.profile_pic} value={form.profile_pic} onChange={handleChange} error={errors.profile_pic} existingImage={initialData?.profile_pic} />

          {/* name */}
          <div className="grid grid-cols-2 gap-4">
            <Input value={form.fname} label="First Name" name="fname" isImportant onChange={handleChange} error={errors.fname} placeholder="Enter first name" />
            <Input value={form.lname} label="Last Name" name="lname" isImportant onChange={handleChange} error={errors.lname} placeholder="Enter last name" />
          </div>

          {/* gmail */}
          <Input value={form.email} label="Email Address" name="email" isImportant onChange={handleChange} error={errors.email} placeholder="staff@gmail.com" />

          {/* password */}
          <Input value={form.password} type="password" label={form.user_id ? "Change Password (Optional)" : "Password"} name="password" isImportant={!form.user_id} onChange={handleChange} error={errors.password} placeholder="Enter at least 6 characters" />

          {/* staff role */}
          <div className="relative flex flex-col w-full gap-1" ref={roleRef}>
            <label className="ml-1 text-sm font-medium text-gray-700">Staff Role <span className="text-red-500">*</span></label>
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer min-h-[42px] hover:border-black transition-all" onClick={() => setShowRoleDropdown(!showRoleDropdown)}>
              <span className="text-sm text-gray-700">{userRoles.find(r => r.id === Number(form.role_id))?.label || "Select Role"}</span>
              <span className={`text-gray-400 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`}>▾</span>
            </div>
            {showRoleDropdown && (
              <div className="absolute left-0 right-0 z-50 w-full mt-1 overflow-y-auto bg-white border border-gray-200 shadow-2xl top-full max-h-60 rounded-xl">
                {userRoles.map((role) => (
                  <div 
                    key={role.id} 
                    onClick={() => { 
                      const defaultPermissions = {
                        3: ["role_dashboard", "appointment_management", "shop_management", "transaction_management", "staff_management", "inventory_management", "service_management", "branch_settings"],
                        4: ["role_dashboard", "appointment_management", "transaction_management"], 
                        5: ["role_dashboard", "appointment_management", "transaction_management"], 
                        6: ["role_dashboard", "appointment_management", "shop_management", "transaction_management"] 
                      };

                      setForm(prev => ({ 
                        ...prev, 
                        role_id: role.id,
                        // apply the default permissions for the selected role
                        permissions: defaultPermissions[role.id] || [] 
                      }));  

                      // clear permission errors since we just filled them
                      setErrors(prev => ({ ...prev, permissions: "valid" }));
                      
                      setShowRoleDropdown(false); 
                    }}
                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center ${Number(form.role_id) === role.id ? "text-(--clr-primary) bg-gray-50" : "text-gray-600"}`}
                    >
                      <p>{role.label}</p> {Number(form.role_id) === role.id && <span className="text-(--clr-primary) font-bold">✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* staff permission */}
          <div className="relative flex flex-col w-full gap-1" ref={permissionRef}>
            <label className="ml-1 text-sm font-medium text-gray-700">Access Permissions <span className="text-red-500">*</span></label>
            <div className={`flex items-center justify-between gap-2 px-3 py-2 border rounded-lg bg-white min-h-[42px] cursor-pointer transition-all ${getPermissionBorder()}`} onClick={() => setShowPermissions(!showPermissions)}>
              <div className="flex flex-wrap flex-1 gap-2">
                {form.permissions.length === 0 && <span className="text-sm text-gray-400">Select permissions...</span>}
                {form.permissions.map(selectedId => (
                  <span key={selectedId} className="px-3 py-1 bg-(--clr-primary) text-white text-[11px] font-bold rounded-full flex items-center gap-2 uppercase">
                  {availablePermissions.find(p => p.id === selectedId)?.label}
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleChange({ target: { name: 'permissions', value: selectedId } }); }}>×</button>
                  </span>
                ))}
              </div>
              <span className={`text-gray-400 transition-transform ${showPermissions ? 'rotate-180' : ''}`}>▾</span>
            </div>
            {errors.permissions && errors.permissions !== "valid" && (
              <p className="flex items-center gap-0.5 text-xs text-red-500 ml-1">
                <HiMiniExclamationCircle size={16} /> {errors.permissions}
              </p>
            )}
            {showPermissions && (
              <div className="absolute left-0 right-0 z-50 w-full mt-1 overflow-y-auto bg-white border border-gray-200 top-full max-h-60 rounded-xl shadow-xl">
                {availablePermissions
                  .filter(perm => {
                    // list of permissions only available for admins
                    const isAdminPermission = [
                      "staff_management", 
                      "inventory_management",
                      "service_management",
                      "branch_settings"
                    ].includes(perm.id);
                    
                    const isBranchAdmin = Number(form.role_id) === 3;

                    // block admin only permissions
                    if(isAdminPermission) {
                      return isBranchAdmin;
                    }
                    
                    return true; 
                  })
                  .map(perm => (
                    <div 
                      key={perm.id} 
                      onClick={() => handleChange({ target: { name: 'permissions', value: perm.id } })} 
                      className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 flex justify-between items-center ${form.permissions.includes(perm.id) ? "text-(--clr-primary) bg-gray-50" : "text-gray-600"}`}
                    >
                      <p>{perm.label}</p> 
                      {form.permissions.includes(perm.id) && <span className="text-(--clr-primary) font-bold">✓</span>}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* working schedule */}
          <div className="pt-2">
            <h1 className='mb-2 ml-1 text-sm font-medium text-gray-700'>Working Schedule</h1>
            <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
              <div className="overflow-x-auto min-w-[500px]">
                <div className="grid grid-cols-12 bg-gray-50 border-b border-gray-200 px-6 py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  <div className="col-span-3">Day</div>
                  <div className="col-span-6 text-center">Hours</div>
                  <div className="col-span-3 text-right">Status</div>
                </div>
                <div className="divide-y divide-gray-100">
                  {daysOfWeek.map((day) => {
                    const bDay = branchSchedule?.find(b => b.day_of_week === day);
                    const isBranchClosed = bDay ? Number(bDay.is_closed) === 1 : false;
                    const isStaffWorking = !!form.schedule[day]?.is_workday;
                    const bStart = bDay?.start_time?.substring(0, 5) || "00:00";
                    const bEnd = bDay?.end_time?.substring(0, 5) || "00:00";
                    const timeError = isStaffWorking && (form.schedule[day].start < bStart || form.schedule[day].end > bEnd);

                    return (
                      <div key={day} className="flex flex-col">
                        <div className="grid grid-cols-12 items-center px-6 py-3.5">
                          <div className="col-span-3">
                            <span className={`text-xs font-bold ${(isBranchClosed || !isStaffWorking)? 'text-gray-300' : 'text-gray-700'}`}>{day}</span>
                          </div>
                          <div className={`col-span-6 flex items-center justify-center gap-2 ${(isBranchClosed || !isStaffWorking) ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                            <input type="time" value={form.schedule[day].start} onChange={(e) => handleScheduleChange(day, 'start', e.target.value)} className={`border rounded-md px-1 py-1 text-[11px] font-bold outline-none ${timeError && form.schedule[day].start < bStart ? 'border-red-500 text-red-600' : 'border-gray-200 text-gray-800'}`} />
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">TO</span>
                            <input type="time" value={form.schedule[day].end} onChange={(e) => handleScheduleChange(day, 'end', e.target.value)} className={`border rounded-md px-1 py-1 text-[11px] font-bold outline-none ${timeError && form.schedule[day].end > bEnd ? 'border-red-500 text-red-600' : 'border-gray-200 text-gray-800'}`} />
                          </div>
                          <div className="flex justify-end col-span-3">
                            <label className={`relative inline-flex items-center ${isBranchClosed ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                              <input type="checkbox" className="sr-only peer" disabled={isBranchClosed} checked={isStaffWorking && !isBranchClosed} onChange={(e) => handleScheduleChange(day, 'is_workday', e.target.checked)} />
                              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-(--clr-primary)"></div>
                              <span className={`ms-2 text-[9px] font-black uppercase tracking-tighter w-14 ${isBranchClosed ? 'text-red-400' : isStaffWorking ? 'text-(--clr-primary)' : 'text-red-400'}`}>
                                {isBranchClosed ? 'Closed' : isStaffWorking ? 'On Duty' : 'Off Duty'}
                              </span>
                            </label>
                          </div>
                        </div>
                        {timeError && <p className="text-[9px] font-bold text-red-500 uppercase text-center pb-2">Outside Branch Hours: {format12h(bStart)} - {format12h(bEnd)}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-white uppercase bg-(--clr-primary) rounded-xl hover:bg-(--clr-primary)/95 cursor-pointer disabled:opacity-50 mt-4">
            <HiSave size={18}/> {isSubmitting ? "Saving..." : "Save Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}