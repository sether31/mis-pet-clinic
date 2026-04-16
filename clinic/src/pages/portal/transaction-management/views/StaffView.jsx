import { useState } from 'react';
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionProfilingModal from '../components/TransactionProfilingModal'; 

export default function StaffView({ 
  transactions,
  summary,
  loading,
  onRefresh,
  user 
}) {
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialStep, setInitialStep] = useState(1);

  const handleViewDetails = (profile) => {
    setSelectedOwner(profile);
    
    // Guest handling logic (matches your admin view)
    if (!profile.user_id) {
      setInitialStep(2); 
    } else {
      setInitialStep(1);
    }
    
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOwner(null);
  };

  // Securely get the branch info from the authenticated user, NOT the transactions array
  const branchName = user?.branch_name || 'Assigned Branch';
  const branchId = user?.branch_id || 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col items-start justify-between gap-4 pb-2 border-b border-gray-100 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Transaction Management Overview
          </h1>
          <p className="text-sm font-medium text-gray-500">
            Billing logs and service history for your current branch location.
          </p>
        </div>

        {/* Read-Only Branch Badge */}
        <div className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl select-none">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">
            Current Assigned Branch
          </span>
          <span className="text-sm font-bold text-gray-700">
            (ID: {branchId}) {branchName}
          </span>
        </div>
      </div>

      {/* cards */}
      <TransactionCard summary={summary} />

      {/* table */}
      <div className="w-full">
        <TransactionTable 
          data={transactions} 
          loading={loading} 
          onRefresh={onRefresh}
          onViewDetails={handleViewDetails}
          isGlobalView={false} 
        />
      </div>

      {/* modal */}
      {isModalOpen && selectedOwner && (
        <TransactionProfilingModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          owner={selectedOwner}
          branchId={branchId}
          forcedStep={initialStep}
        />
      )}
    </div>
  );
}