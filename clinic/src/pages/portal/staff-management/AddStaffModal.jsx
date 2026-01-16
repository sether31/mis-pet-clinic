import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
import { validateEmail } from '../../../utils/validateEmail';
// components
import Input from '../../../components/Input'; 
// icons
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function AddStaffModal({ initialData, onClose, onRefresh, branchId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const userRoles = [
    { id: 4, label: 'Branch Manager' },
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
    permissions: "Access Permissions"
  };

  const availablePermissions = [
    { id: "role_dashboard", label: "Role Dashboard"},
    { id: "staff_management", label: "Staff Management"}
  ];

  const [form, setForm] = useState({
    user_id: initialData?.user_id,
    fname: initialData?.fname || '',
    lname: initialData?.lname || '',
    email: initialData?.email || '',
    password: '',
    role_id: initialData?.role_id || 5,
    permissions: initialData?.permissions || [],
    is_active: initialData ? Number(initialData.status) : 0
  });


  // check dynamically the user inputs
  const handleChange = (e) => {
    const { name, value, checked } = e.target;

    // check permission
    if(name === "permissions") {
      const selected = [...form.permissions];
      if(checked) {
        selected.push(value);
      } else {
        selected.splice(selected.indexOf(value), 1);
      }

      setForm(prev => ({ ...prev, permissions: selected }));
      setErrors(prev => ({
        ...prev,
        permissions: selected.length === 0 ? "Select at least one permission." : "valid"
      }));
      return;
    }

    // handle normal inputs and put it in form
    setForm(prev => ({ ...prev, [name]: value }));

    // check if email is valid
    if(name === "email") {
      if(!value.trim()) {
        setErrors(prev => ({ ...prev, email: `${inputLabels[name]} is required.` }));
      } else if(!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: "Invalid email." }));
      } else {
        setErrors(prev => ({ ...prev, email: "valid" }));
      }
    } else if(name === "password" && !form.user_id) {
      setErrors(prev => ({
        ...prev,
        password: value.length < 6 ? "Password must be at least 6 characters." : "valid"
      }));
    } else if(!value.trim()) {
      setErrors(prev => ({ ...prev, [name]: `${inputLabels[name]} is required.` }));
    } else {
      setErrors(prev => ({ ...prev, [name]: "valid" }));
    }
  };

  // validate form
  const validateForm = () => {
    const newErrors = {};
    const required = ["fname", "lname", "email", "role_id"];
    
    required.forEach(field => {
      if(!form[field] || !form[field].toString().trim()) {
        newErrors[field] = `${inputLabels[field]} is required.`;
      }
    });

    if(!form.user_id && !form.password) {
      newErrors.password = "Password is required for new accounts.";
    }

    if(form.email && !validateEmail(form.email)) {
      newErrors.email = "Invalid email.";
    }

    if(form.permissions.length === 0) {
      newErrors.permissions = "Select at least one permission.";
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
    const isUpdating = Boolean(form.user_id);
    const endpoint = isUpdating ? 'update-staff.php' : 'create-staff.php';

    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/staff/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          branch_id: branchId,
          status: form.is_active
        })
      }, ['clinic_admin', 'branch_admin', 'veterinarian', 'groomer', 'staff']);
      
      if(response.success) {
        toast.success(response.message || "Staff saved successfully");
        onRefresh();
        onClose();
      } else {
        if(response.message.includes("Email")) setErrors(prev => ({ ...prev, email: response.message }));
        toast.error(response.message || "Something went wrong");
      }
    } catch(error) {
      console.log(error);
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-100 bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl overflow-hidden bg-white shadow-2xl rounded-2xl">
        
        {/* header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-800 uppercase">
              {form.user_id ? 'Edit Staff Member' : 'Add New Staff'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {form.user_id ? 'Manage' : 'Create'} {' '}
              staff account
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-2 gap-4">
            <Input
              value={form.fname}
              label="First Name"
              id="fname"
              name="fname"
              isImportant={true}
              placeholder="First name"
              onChange={handleChange}
              error={errors.fname}
            />
            <Input
              value={form.lname}
              label="Last Name"
              id="lname"
              name="lname"
              isImportant={true}
              placeholder="Last name"
              onChange={handleChange}
              error={errors.lname}
            />
          </div>

          <Input
            value={form.email}
            label="Email Address"
            id="email"
            name="email"
            isImportant={true}
            placeholder="staff@gmail.com"
            onChange={handleChange}
            error={errors.email}
          />

          {!form.user_id && (
            <Input
              value={form.password}
              type="password"
              label="Password"
              id="password"
              name="password"
              isImportant={true}
              placeholder="Set a password"
              onChange={handleChange}
              error={errors.password}
            />
          )}

          <div className="space-y-1">
            <label className="ml-1 text-sm font-medium text-gray-700">Role <span className="text-red-500">*</span></label>
            <select 
              name="role_id"
              className={`w-full p-2 border rounded-lg outline-none bg-white transition-all cursor-pointer
                hover:bg-gray-50
                ${errors.role === 'valid' ? 'border-(--clr-primary)' : 'border-gray-300'}
              `}
              value={form.role_id}
              onChange={handleChange}
            >
              {userRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <label className="ml-1 text-sm font-medium text-gray-700">Access Permissions <span className="text-red-500">*</span></label>
            <div className="grid gap-2 mt-2">
              {availablePermissions.map((perm) => (
                <label key={perm.id} className="flex items-center gap-2 p-3 transition-all border border-gray-100 cursor-pointer rounded-xl bg-gray-50 hover:bg-gray-100">
                  <input 
                    type="checkbox"
                    name="permissions"
                    value={perm.id}
                    checked={form.permissions.includes(perm.id)}
                    onChange={handleChange}
                    className="w-4 h-4 accent-(--clr-primary)"
                  />
                  <span className="text-xs font-bold text-gray-700 uppercase">{perm.label}</span>
                </label>
              ))}
            </div>
            {errors.permissions && errors.permissions !== "valid" && (
              <p className="flex items-center gap-0.5 mt-2 text-xs text-red-500">
                <HiMiniExclamationCircle size={16} />
                {errors.permissions}
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-white uppercase transition-all bg-(--clr-primary) cursor-pointer rounded-xl hover:bg-(--clr-primary)/90 disabled:opacity-50"
          >
            <HiSave size={18}/>
            {isSubmitting ? "Saving..." : "Save Staff Account"}
          </button>
        </form>
      </div>
    </div>
  );
}