import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import Input from '../../../../components/Input'; 
import InputImage from '../../../../components/InputImage';
// icons
import { HiXCircle, HiSave } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';

const API_URL = import.meta.env.VITE_API_URL;

export default function InventoryModal({ initialData, onClose, onRefresh, branchId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    product_id: initialData?.product_id || null,
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || '', 
    category: initialData?.category || 'Medication',
    prod_pic: null,
    inventory_id: initialData?.inventory_id || null,
    stock_adjustment: '', 
    unit_cost: initialData?.unit_cost || '', 
    expiry_date: initialData?.expiry_date ? initialData.expiry_date.split(' ')[0] : '',
    min_stock_level: initialData?.min_stock_level || '',
    supplier_name: initialData?.supplier_name || '',
    supplier_contact: initialData?.supplier_contact || '' 
  });

  const categories = ["Medication", "Supplies", "Pet Food", "Accessories", "Hygiene"];

  const formattedDateUpdate = initialData?.updated_at 
    ? new Date(initialData.updated_at).toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }) 
    : "--:--";

  const handleChange = (e) => {
    const { name, value, type, files } = e.target || { 
      name: 'prod_pic', 
      value: e, 
      type: (e instanceof File || typeof e === 'string') ? 'file' : 'text' 
    };
    const updatedValue = type === "file" ? (files ? files[0] : value) : value;

    if(type !== "file") {
      const stringVal = String(updatedValue).trim();
      
      // 👇 ADDED: Don't show "Required" error for Expiry Date if it's an Accessory
      if(!stringVal && name !== 'stock_adjustment' && !(name === 'expiry_date' && form.category === 'Accessories')) {
        const labels = {
          name: "Product name",
          description: "Description",
          price: "Price",
          unit_cost: "Unit cost",
          min_stock_level: "Restock level",
          expiry_date: "Expiry date",
          supplier_name: "Supplier name",
          supplier_contact: "Supplier contact"
        };
        setErrors(prev => ({ ...prev, [name]: `${labels[name] || name} is required.` }));
      } else if ((name === 'price' || name === 'unit_cost') && Number(updatedValue) <= 0) {
        setErrors(prev => ({ ...prev, [name]: "Must be greater than 0." }));
      } else if (name === 'stock_adjustment' && updatedValue !== '') {
        const adjustment = Number(updatedValue);
        const currentStock = Number(initialData?.stock_level || 0);
        
        if (!form.product_id && adjustment < 0) {
          setErrors(prev => ({ ...prev, [name]: "Initial stock cannot be negative." }));
        } else if (form.product_id && (currentStock + adjustment < 0)) {
          setErrors(prev => ({ ...prev, [name]: "Stock cannot drop below 0." }));
        } else {
          setErrors(prev => ({ ...prev, [name]: "valid" }));
        }
      } else {
        setErrors(prev => ({ ...prev, [name]: "valid" }));
      }
    }

    setForm(prev => ({ ...prev, [name]: updatedValue }));

    // 👇 ADDED: Clear expiry date error if user switches category to Accessories
    if (name === 'category' && updatedValue === 'Accessories') {
        setErrors(prev => {
            const newErrs = { ...prev };
            delete newErrs.expiry_date;
            return newErrs;
        });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    if (!form.description.trim()) newErrors.description = "Description is required.";
    if (!form.price || form.price <= 0) newErrors.price = "Valid price is required.";
    if (!form.unit_cost || form.unit_cost <= 0) newErrors.unit_cost = "Unit cost is required.";
    if (form.min_stock_level === '' || form.min_stock_level < 0) newErrors.min_stock_level = "Restock level is required.";
    
    // 👇 MODIFIED: Skip expiry validation if category is Accessories
    if (form.category !== 'Accessories' && !form.expiry_date) {
        newErrors.expiry_date = "Expiry date is required.";
    }

    if (!form.supplier_name.trim()) newErrors.supplier_name = "Supplier name is required.";
    if (!form.supplier_contact.trim()) newErrors.supplier_contact = "Supplier contact is required.";
    
    if(!form.product_id && !form.prod_pic) {
      newErrors.prod_pic = "Product image is required.";
    }

    const adjustment = Number(form.stock_adjustment || 0);
    const currentStock = Number(initialData?.stock_level || 0);

    if(!form.product_id && (form.stock_adjustment === '' || adjustment < 0)) {
        newErrors.stock_adjustment = "Initial stock is required and cannot be negative.";
    }
    if(form.product_id && (currentStock + adjustment < 0)) {
        newErrors.stock_adjustment = "Final stock cannot drop below 0.";
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill up all required fields.");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    
    const currentStock = Number(initialData?.stock_level || 0);
    const adjustment = Number(form.stock_adjustment || 0);
    const finalStockLevel = form.product_id ? (currentStock + adjustment) : adjustment;

    Object.keys(form).forEach(key => {
      if(key === 'prod_pic') { 
        if (form[key]) fd.append(key, form[key]); 
      } 
      else if(key !== 'stock_adjustment' && form[key] !== null) { 
        // 👇 ADDED: Ensure expiry_date is sent as empty string if it's an accessory
        if (key === 'expiry_date' && form.category === 'Accessories') {
            fd.append(key, '');
        } else {
            fd.append(key, form[key]); 
        }
      }
    });
    
    fd.append('stock_level', finalStockLevel);
    fd.append('branch_id', branchId);

    try {
      const endpoint = form.product_id ? 'update-product-inventory.php' : 'create-product-inventory.php';
      const response = await authFetch(`${API_URL}/api/clinic/general/inventory/${endpoint}`, { 
        method: 'POST', body: fd 
      });
      if(response.success) {
        toast.success(response.message || "Inventory updated");
        onRefresh(); onClose();
      } else {
        toast.error(response.message || "Error saving item");
      }
    } catch(error) { toast.error("Something went wrong"); } 
    finally { setIsSubmitting(false); }
  };

  const getBorderClass = (name) => {
    if (errors[name] === "valid") return "border-(--clr-primary)";
    if (errors[name] && errors[name] !== "valid") return "border-red-500";
    return "border-gray-300 focus:border-black";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 text-left z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl">
        
        {/* header */}
        <div className="flex items-center justify-between flex-shrink-0 p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black leading-none tracking-tight text-gray-800 uppercase">
              {form.product_id ? 'Update Stock Item' : 'Add New Item'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Inventory & Product Management
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-all cursor-pointer hover:text-red-500">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
          <InputImage 
            label="Product Image" name="prod_pic" isPreview={true} 
            required={!form.product_id} value={form.prod_pic} 
            onChange={handleChange} error={errors.prod_pic} 
            existingImage={initialData?.prod_pic} 
          />

          <Input 
            value={form.name} label="Product Name" name="name" 
            isImportant onChange={handleChange} error={errors.name} 
            placeholder="Pedigree for dogs" 
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="ml-1 text-sm font-medium tracking-tight text-gray-800">Category <span className="text-red-500">*</span></label>
              <select 
                name="category" value={form.category} onChange={handleChange}
                className={`w-full p-2.5 bg-white border rounded-lg text-sm outline-none transition-all ${getBorderClass('category')}`}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <Input 
              type="number" value={form.price} label="Retail Price (Sell)" 
              name="price" isImportant onChange={handleChange} 
              error={errors.price} placeholder="0.00" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="number" value={form.unit_cost} label="Unit Cost (Buy)" 
              name="unit_cost" isImportant onChange={handleChange} 
              error={errors.unit_cost} placeholder="0.00" 
            />
            <Input 
              type="number" value={form.min_stock_level} label="Restock Level Alert" 
              name="min_stock_level" isImportant onChange={handleChange} 
              error={errors.min_stock_level} placeholder="Enter min stock..." 
            />
          </div>

          {/* SPLIT INVENTORY UI */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl">
            <Input 
              type="number" 
              value={initialData?.stock_level || 0} 
              label="Current Stock" 
              disabled={true} 
            />
            <Input 
              type="number" 
              value={form.stock_adjustment} 
              label={form.product_id ? "Adjust Stock (+ / -)" : "Initial Stock Amount"} 
              name="stock_adjustment" 
              isImportant={!form.product_id} 
              onChange={handleChange} 
              error={errors.stock_adjustment} 
              placeholder={form.product_id ? "e.g. 20 or -5" : "Enter amount..."} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              value={form.supplier_name} label="Supplier Name" 
              name="supplier_name" isImportant onChange={handleChange} 
              error={errors.supplier_name} placeholder="PetCare Dist." 
            />
            <Input 
              value={form.supplier_contact} label="Supplier Contact #" 
              name="supplier_contact" isImportant onChange={handleChange} 
              error={errors.supplier_contact} placeholder="0912 345 6789" 
            />
          </div>
          
          {/* 👇 MODIFIED: Wrapped in conditional check */}
          {form.category !== 'Accessories' && (
            <div className="grid grid-cols-1">
               <Input 
                type="date" value={form.expiry_date} label="Expiry Date" 
                name="expiry_date" isImportant onChange={handleChange} 
                error={errors.expiry_date} 
              />
            </div>
          )}

          <div className="flex flex-col gap-1 pb-2">
            <label className="ml-1 text-sm font-medium text-gray-700">Description <span className='text-red-500'>*</span></label>
            <textarea 
              name="description" value={form.description} onChange={handleChange}
              placeholder="Enter product details..."
              className={`w-full p-3 bg-white border rounded-lg text-sm min-h-[80px] outline-none transition-all ${getBorderClass('description')}`}
            />
            {errors.description && errors.description !== "valid" && (
              <p className="flex items-center gap-0.5 text-xs text-red-500 mt-1">
                <HiMiniExclamationCircle size={16} />
                {errors.description}
              </p>
            )}
          </div>

          <button 
            type="submit" disabled={isSubmitting} 
            className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black tracking-widest text-white uppercase bg-(--clr-primary) rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4 flex-shrink-0 hover:bg-(--clr-primary)/95 cursor-pointer"
          >
            <HiSave size={18}/> {isSubmitting ? "Saving..." : "Save Product & Stock"}
          </button>

          {/* AUDIT */}
          {initialData?.product_id && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <p className="text-[10px] font-bold text-gray-700 uppercase italic">
                    Last Updated: {initialData.updated_at ? formattedDateUpdate : '---'}
                  </p>
                  <span className="text-gray-300">|</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-black uppercase ${!initialData.last_updated_by ? 'text-amber-500' : 'text-(--clr-primary)'}`}>
                      Updated By: {initialData.updated_by_staff_name || initialData.last_updated_by || 'No record yet'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}