import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../../hooks/useUI';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
// sub components
import InventoryTable from './components/InventoryTable';
import InventoryModal from './components/InventoryModal';
import InventoryCard from './components/InventoryCard';

const API_URL = import.meta.env.VITE_API_URL;

export default function InventoryManagement() {
  const { branchId } = useParams();
  const { showLoader, hideLoader } = useUI();
  const [inventoryData, setInventoryData] = useState([]);
  const [inventoryCardData, setInventoryCardData] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const fetchInventory = useCallback(async () => {
  
    showLoader();
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/inventory/get-inventory.php?branchId=${branchId}`);
      if(response.success) {
        setInventoryData(response.data);
        setInventoryCardData(response.cardData);
      } else {
        toast.error(response.message || "Failed to fetch inventory");
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    }
  }, [branchId, showLoader, hideLoader]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

   // ensure form is empty
  const handleCreate = () => {
    setSelectedProduct(null); 
    setIsModalOpen(true);
  };

  // pass existing data to form
  const handleEdit = (item) => {
    setSelectedProduct(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // handle inventory status
  const handleToggleStatus = async (item) => {
    const isCurrentlyActive = Number(item.is_active) === 1;
    const newStatus = isCurrentlyActive ? 0 : 1;
    const actionText = newStatus === 0 ? 'archive' : 'restore';

    if (!window.confirm(`Are you sure you want to ${actionText} "${item.name}"?`)) return;

    showLoader();
    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/inventory/update-inventory-status.php`, {
        method: 'POST',
        body: JSON.stringify({
          inventory_id: item.inventory_id,
          status: newStatus
        })
      });

      if(response.success) {
        toast.success(response.message);
        await fetchInventory(); 
      } else {
        toast.error(response.message);
      }
    } catch(error) {
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    }
  };
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory & Product Management</h1>
            <p className="text-gray-500">Manage products, batches, and stock levels</p>
          </div>
        </div>
        
        <InventoryCard data={inventoryCardData} />

        <div className="mt-8">
          <InventoryTable 
            data={inventoryData} 
            onCreate={handleCreate} 
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}        
          />
        </div>

        {/* inventory modal */}
        {isModalOpen && (
          <InventoryModal 
            initialData={selectedProduct}
            onClose={handleCloseModal}
            onRefresh={fetchInventory}
            branchId={branchId}
          />
        )}

      </section>
    </div>
  );
}