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
    stock_level: initialData?.stock_level || '',
    unit_cost: initialData?.unit_cost || '', 
    expiry_date: initialData?.expiry_date ? initialData.expiry_date.split(' ')[0] : '',
    min_stock_level: initialData?.min_stock_level || '',
    supplier_name: initialData?.supplier_name || '',
    supplier_contact: initialData?.supplier_contact || '' 
  });

  const categories = ["Medication", "Supplies", "Pet Food", "Accessories", "Hygiene"];

  const handleChange = (e) => {
    const { name, value, type, files } = e.target || { 
      name: 'prod_pic', 
      value: e, 
      type: (e instanceof File || typeof e === 'string') ? 'file' : 'text' 
    };
    const updatedValue = type === "file" ? (files ? files[0] : value) : value;

    if(type !== "file") {
      const stringVal = String(updatedValue).trim();
      
      if(!stringVal) {
        const labels = {
          name: "Product name",
          description: "Description",
          price: "Price",
          unit_cost: "Unit cost",
          stock_level: "Stock quantity",
          min_stock_level: "Restock level",
          expiry_date: "Expiry date",
          supplier_name: "Supplier name",
          supplier_contact: "Supplier contact"
        };
        setErrors(prev => ({ ...prev, [name]: `${labels[name] || name} is required.` }));
      } else if ((name === 'price' || name === 'unit_cost') && Number(updatedValue) <= 0) {
        setErrors(prev => ({ ...prev, [name]: "Must be greater than 0." }));
      } else {
        setErrors(prev => ({ ...prev, [name]: "valid" }));
      }
    }

    setForm(prev => ({ ...prev, [name]: updatedValue }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    if (!form.description.trim()) newErrors.description = "Description is required.";
    if (!form.price || form.price <= 0) newErrors.price = "Valid price is required.";
    if (!form.unit_cost || form.unit_cost <= 0) newErrors.unit_cost = "Unit cost is required.";
    if (form.stock_level === '' || form.stock_level < 0) newErrors.stock_level = "Stock quantity is required.";
    if (form.min_stock_level === '' || form.min_stock_level < 0) newErrors.min_stock_level = "Restock level is required.";
    if (!form.expiry_date) newErrors.expiry_date = "Expiry date is required.";
    if (!form.supplier_name.trim()) newErrors.supplier_name = "Supplier name is required.";
    if (!form.supplier_contact.trim()) newErrors.supplier_contact = "Supplier contact is required.";
    
    if(!form.product_id && !form.prod_pic) {
      newErrors.prod_pic = "Product image is required.";
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
    Object.keys(form).forEach(key => {
      if(key === 'prod_pic') { 
        if (form[key]) fd.append(key, form[key]); 
      } 
      else if(form[key] !== null) { 
        fd.append(key, form[key]); 
      }
    });
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
              type="number" value={form.stock_level} label="Stock Quantity" 
              name="stock_level" isImportant onChange={handleChange} 
              error={errors.stock_level} placeholder="Enter quantity..." 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              type="number" value={form.min_stock_level} label="Restock Level" 
              name="min_stock_level" isImportant onChange={handleChange} 
              error={errors.min_stock_level} placeholder="Enter stock..." 
            />
             <Input 
              type="date" value={form.expiry_date} label="Expiry Date" 
              name="expiry_date" isImportant onChange={handleChange} 
              error={errors.expiry_date} 
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
        </form>
      </div>
    </div>
  );
}