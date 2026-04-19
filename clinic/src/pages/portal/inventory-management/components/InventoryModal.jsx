import { useState } from 'react';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import Input from '../../../../components/Input'; 
import InputImage from '../../../../components/InputImage';
// icons
import { HiXCircle, HiSave } from 'react-icons/hi';

const API_URL = import.meta.env.VITE_API_URL;

export default function InventoryModal({ initialData, onClose, onRefresh, branchId }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    product_id: initialData?.product_id || null,
    name: initialData?.name || '',
    brand_type: initialData?.brand_type || 'Branded',
    brand_name: initialData?.brand_name || '',
    dosage: initialData?.dosage || '', 
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
  const brandTypes = ["Branded", "Generic", "N/A"];
  const showBrandType = form.category === 'Medication' || form.category === 'Supplies';

  const handleChange = (e) => {
    const { name, value, type, files } = e.target || { 
      name: 'prod_pic', 
      value: e, 
      type: (e instanceof File || typeof e === 'string') ? 'file' : 'text' 
    };
    const updatedValue = type === "file" ? (files ? files[0] : value) : value;

    if(type !== "file") {
      const stringVal = String(updatedValue).trim();
      
      if(!stringVal && name !== 'stock_adjustment') {
        // Dynamic labels for real-time error messages
        const labels = {
          name: "Product name",
          brand_name: "Brand name",
          dosage: form.category === 'Medication' ? "Dosage" : "Size/Volume",
          description: "Description",
          price: "Retail price",
          unit_cost: "Unit cost",
          min_stock_level: "Low stock alert",
          expiry_date: "Expiry date",
          supplier_name: "Supplier name",
          supplier_contact: "Supplier contact"
        };

        // Filter: Don't show error for expiry if it's an accessory
        const isExpiryRequired = form.category !== 'Accessories' && name === 'expiry_date';
        const isDosageRequired = form.category === 'Medication' && name === 'dosage';

        if ((name === 'expiry_date' && isExpiryRequired) || (name === 'dosage' && isDosageRequired) || (!['expiry_date', 'dosage'].includes(name))) {
            setErrors(prev => ({ ...prev, [name]: `${labels[name] || name} is required.` }));
        }
      } else {
        setErrors(prev => ({ ...prev, [name]: "valid" }));
      }
    }

    setForm(prev => ({ ...prev, [name]: updatedValue }));

    if (name === 'category') {
      setErrors(prev => {
        const newErrs = { ...prev };
        if (updatedValue === 'Accessories') delete newErrs.expiry_date;
        if (updatedValue !== 'Medication') delete newErrs.dosage;
        return newErrs;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // 1. Strings - using optional chaining and trim
    if (!form.name?.trim()) newErrors.name = "Product name is required.";
    if (!form.brand_name?.trim()) newErrors.brand_name = "Brand name is required.";
    if (!form.description?.trim()) newErrors.description = "Description is required.";
    
    // 2. Conditional Dosage (Only if Medication)
    if (form.category === 'Medication' && !String(form.dosage || '').trim()) {
      newErrors.dosage = "Dosage is required.";
    }

    // 3. Price & Cost (Handle as numbers)
    if (form.price === '' || parseFloat(form.price) <= 0) {
      newErrors.price = "Valid retail price is required.";
    }
    if (form.unit_cost === '' || parseFloat(form.unit_cost) <= 0) {
      newErrors.unit_cost = "Valid unit cost is required.";
    }

    // 4. Stock Logic
    const adj = form.stock_adjustment === '' ? 0 : parseInt(form.stock_adjustment);
    if (!form.product_id) {
      // NEW ITEM
      if (form.stock_adjustment === '' || adj < 0) {
        newErrors.stock_adjustment = "Initial stock is required.";
      }
    } else {
      // UPDATE ITEM
      const current = Number(initialData?.stock_level || 0);
      if (current + adj < 0) {
        newErrors.stock_adjustment = "Resulting stock cannot be negative.";
      }
    }

    // 5. Expiry (Required for non-accessories)
    if (form.category !== 'Accessories' && !form.expiry_date) {
      newErrors.expiry_date = "Expiry date is required.";
    }

    // 6. Supplier
    if (!form.supplier_name?.trim()) newErrors.supplier_name = "Supplier name is required.";
    if (!form.supplier_contact?.trim()) newErrors.supplier_contact = "Supplier contact is required.";

    // 7. Image (New items only)
    if (!form.product_id && !form.prod_pic) {
      newErrors.prod_pic = "Image is required.";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double clicks

    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      // 👇 THIS IS YOUR BEST FRIEND FOR DEBUGGING:
      console.error("VALIDATION FAILED:", validationErrors);
      setErrors(validationErrors);
      toast.error("Please check the required fields.");
      return;
    }

    setIsSubmitting(true);

    const fd = new FormData();
    
    // Logic for stock adjustment
    const adjustment = Number(form.stock_adjustment || 0);
    const currentStock = Number(initialData?.stock_level || 0);
    const finalStockLevel = form.product_id ? (currentStock + adjustment) : adjustment;

    Object.keys(form).forEach(key => {
      if (key === 'prod_pic') {
        if (form[key] instanceof File) {
          fd.append(key, form[key]);
        }
      } else if (key === 'inventory_id' || key === 'product_id') {
        // CRITICAL: Ensure IDs are sent as strings or null correctly
        if (form[key] !== null) fd.append(key, form[key]);
      } else if (key !== 'stock_adjustment' && form[key] !== null) {
        // Handle Accessories Expiry
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
      // Determine endpoint based on existence of product_id
      const endpoint = form.product_id ? 'update-product-inventory.php' : 'create-product-inventory.php';
      
      const response = await authFetch(`${API_URL}/api/clinic/general/inventory/${endpoint}`, { 
        method: 'POST', 
        body: fd 
      });

      if (response.success) {
        toast.success(response.message || "Inventory updated");
        onRefresh(); 
        onClose();
      } else {
        toast.error(response.message || "Error saving item");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBorderClass = (name) => {
    if (errors[name] === "valid") return "border-(--clr-primary)";
    if (errors[name] && errors[name] !== "valid") return "border-red-500";
    return "border-gray-300 focus:border-black";
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[100] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              {form.product_id ? 'Update Stock Item' : 'Add New Item'}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Inventory Management</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-all cursor-pointer">
            <HiXCircle size={32}/>
          </button>
        </div>

        {/* Form Body */}
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
            placeholder="ex. Amoxicillin" 
          />

          <div className="grid grid-cols-2 gap-4">
            {showBrandType && (
              <div className="flex flex-col gap-1">
                <label className="ml-1 text-sm font-medium text-gray-800">Brand Type *</label>
                <select 
                  name="brand_type" value={form.brand_type} onChange={handleChange}
                  className={`w-full p-2.5 bg-white border rounded-lg text-sm outline-none transition-all ${getBorderClass('brand_type')}`}
                >
                  {brandTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
            )}
            <div className={showBrandType ? "col-span-1" : "col-span-2"}>
              <Input 
                value={form.brand_name} label="Brand Name" name="brand_name" 
                isImportant onChange={handleChange} error={errors.brand_name} 
                placeholder="ex. Biogesic" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              value={form.dosage} 
              label={form.category === 'Medication' ? "Dosage" : "Size / Volume"} 
              name="dosage" 
              isImportant={form.category === 'Medication'} 
              onChange={handleChange} 
              error={errors.dosage} 
              placeholder={form.category === 'Medication' ? "ex. 500mg" : "ex. 5kg or 250ml"} 
            />
            <div className="flex flex-col gap-1">
              <label className="ml-1 text-sm font-medium text-gray-800">Category *</label>
              <select 
                name="category" value={form.category} onChange={handleChange}
                className={`w-full p-2.5 bg-white border rounded-lg text-sm outline-none transition-all ${getBorderClass('category')}`}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="number" value={form.price} label="Retail Price (Sell)" name="price" isImportant onChange={handleChange} error={errors.price} placeholder="0.00" />
            <Input type="number" value={form.unit_cost} label="Unit Cost (Buy)" name="unit_cost" isImportant onChange={handleChange} error={errors.unit_cost} placeholder="0.00" />
          </div>

          <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input type="number" value={initialData?.stock_level || 0} label="Current Stock" disabled={true} />
              <Input type="number" value={form.stock_adjustment} label={form.product_id ? "Adjust (+/-)" : "Initial Stock"} name="stock_adjustment" isImportant={!form.product_id} onChange={handleChange} error={errors.stock_adjustment} placeholder="0" />
            </div>
            <Input type="number" value={form.min_stock_level} label="Low Stock Alert Level" name="min_stock_level" isImportant onChange={handleChange} error={errors.min_stock_level} placeholder="5" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input value={form.supplier_name} label="Supplier" name="supplier_name" isImportant onChange={handleChange} error={errors.supplier_name} placeholder="ex. Supplier Name" />
            <Input value={form.supplier_contact} label="Contact #" name="supplier_contact" isImportant onChange={handleChange} error={errors.supplier_contact} placeholder="ex. 09123456789" />
          </div>
          
          {form.category !== 'Accessories' && (
            <Input type="date" value={form.expiry_date} label="Expiry Date" name="expiry_date" isImportant onChange={handleChange} error={errors.expiry_date} />
          )}

          <div className="flex flex-col gap-1 pb-2">
            <label className="ml-1 text-sm font-medium text-gray-700">Description *</label>
            <textarea 
              name="description" 
              value={form.description} 
              onChange={handleChange} 
              placeholder="ex. Description of the product."
              className={`w-full p-3 bg-white border rounded-lg text-sm min-h-[80px] outline-none transition-all ${getBorderClass('description')}`} 
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-full gap-2 py-4 text-xs font-black text-white uppercase bg-(--clr-primary) rounded-xl hover:bg-(--clr-primary)/95 transition-all cursor-pointer">
            <HiSave size={18}/> {isSubmitting ? "Saving..." : "Save Product & Stock"}
          </button>
        </form>
      </div>
    </div>
  );
}