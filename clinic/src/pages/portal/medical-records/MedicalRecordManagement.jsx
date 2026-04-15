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
import MedicalRecordCard from './components/MedicalRecordCard';
import OwnerProfilingTable from './components/OwnerProfilingTable'; 
import OwnerProfilingModal from './components/OwnerProfilingModal'; 
import { useUser } from '../../../hooks/useUser';

const API_URL = import.meta.env.VITE_API_URL;

export default function MedicalRecordManagement() {
  const { branchId } = useParams();
  const {user} = useUser()
  
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('recent'); 

  const [records, setRecords] = useState([]);
  const [owners, setOwners] = useState([]);
  const [cardData, setCardData] = useState(null); 
  
  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Profiling state
  const [profilingOwner, setProfilingOwner] = useState(null); 

  const [allBranches, setAllBranches] = useState([]);

  // 👇 2. Add fetch function for branches
  const fetchBranches = useCallback(async () => {
    if (!branchId || branchId === 'undefined') return;
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/medical/get-branches.php?branch_id=${branchId}`);
      if (res.success) {
        setAllBranches(res.data);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  }, [branchId]);

  // FETCH DATA
  const fetchData = useCallback(async () => {
    if (!branchId || branchId === 'undefined') return;
    setIsLoading(true);
    try {
      const [recRes, ownerRes] = await Promise.all([
        authFetch(`${API_URL}/api/clinic/general/medical/get-completed-appointments.php?branch_id=${branchId}`),
        authFetch(`${API_URL}/api/clinic/general/medical/get-owner-directory.php?branch_id=${branchId}`)
      ]);

      if(recRes.success) {
        setRecords(recRes.data);
        setCardData(recRes.cardData);
      }
      if(ownerRes.success) {
        setOwners(ownerRes.data);
      }
    } catch (error) { 
      toast.error("Something went wrong"); 
    } finally { 
      setIsLoading(false); 
    }
  }, [branchId]);

  useEffect(() => { 
    fetchData(); 
    fetchBranches(); 
  }, [fetchData, fetchBranches]);

  const handleOpenEdit = (record) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-gray-100">
      <Header />
      <section className='px-6 my-6 container-xl'>
        
        <div className="flex flex-col justify-between mb-6 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Medical Records</h1>
            <p className="text-gray-500">Manage patient diagnoses, treatments, and history.</p>
          </div>

          <div className="flex p-1 mt-4 bg-gray-200 rounded-lg md:mt-0">
            <button 
              onClick={() => setViewMode('recent')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all cursor-pointer ${viewMode === 'recent' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              Recent Records
            </button>
            <button 
              onClick={() => setViewMode('directory')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-md transition-all cursor-pointer ${viewMode === 'directory' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
            >
              Record History
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <LoaderV2 />
        ) : (
          <div className="mt-8 space-y-6">
            <MedicalRecordCard data={cardData} />

            {viewMode === 'recent' ? (
              <MedicalRecordTable 
                data={records} 
                branchesList={allBranches}
                onView={(record) => { 
                  setSelectedRecord(record); 
                  setIsRecordModalOpen(true); 
                }} 
                userRole={user.role}
              />
            ) : (
              <OwnerProfilingTable 
                data={owners} 
                onProfile={(id, name, picture) => { 
                  setProfilingOwner({ id, name, picture }); 
                }}
              />
            )}
          </div>
        )}
      </section>

      {/* RECENT RECORD MODAL */}
      {isRecordModalOpen && (
        <MedicalRecordModal 
          isOpen={isRecordModalOpen}
          record={selectedRecord} 
          onClose={() => setIsRecordModalOpen(false)} 
          recordData={selectedRecord}
          onRefresh={fetchData}
        />
      )}

      {/* PROFILING MODAL */}
      <OwnerProfilingModal 
        isOpen={!!profilingOwner}
        onClose={() => setProfilingOwner(null)}
        ownerId={profilingOwner?.id}
        ownerName={profilingOwner?.name}
        ownerPicture={profilingOwner?.picture}
        branchId={branchId}
        onEditRecord={(record) => {
          handleOpenEdit(record); 
        }}
      />

    </div>
  );
}