import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
// utils
import { authFetch } from '../../../utils/authFetch';
// components
import Header from '../../../components/Header';
import LoaderV2 from '../../../components/LoaderV2';
// sub components
import MedicalRecordTable from './components/MedicalRecordTable';
import MedicalRecordModal from './components/MedicalRecordModal';

const API_URL = import.meta.env.VITE_API_URL;

export default function MedicalRecordManagement() {
  const { branchId } = useParams();
  
  const [isLoading, setIsLoading] = useState(true);

  const [records, setRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchRecords = useCallback(async () => {
    if (!branchId || branchId === 'undefined') return;
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/medical/get-completed-appointments.php?branch_id=${branchId}`);
      if(res.success) {
        setRecords(res.data);
      }
    } catch (error) { toast.error("Failed to load records"); }
    finally { setIsLoading(false); }
  }, [branchId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <section className='px-6 my-6 container-xl'>
        <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
            <p className="text-gray-500">Manage patient diagnoses, treatments, and history for all completed/billed appointments.</p>
          </div>
        </div>
        
        {isLoading ? (
          <LoaderV2 />
        ) : (
          <div className="mt-8">
            <MedicalRecordTable 
              data={records} 
              onView={(record) => { 
                setSelectedRecord(record); 
                setIsModalOpen(true); 
              }} 
            />
          </div>
        )}
      </section>

      {isModalOpen && (
        <MedicalRecordModal 
          record={selectedRecord} 
          onClose={() => setIsModalOpen(false)} 
          onRefresh={fetchRecords}
        />
      )}
    </div>
  );
}