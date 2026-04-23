import { useState } from 'react';
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionProfilingModal from '../components/TransactionProfilingModal'; 

export default function ClinicAdminView({ 
  transactions, summary, loading, onRefresh, branches = [], currentBranch, setCurrentBranch, isClinicAdmin 
}) {
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialStep, setInitialStep] = useState(1); 

  const handleViewDetails = (profile) => {
    setSelectedOwner(profile);
    
    if(!profile.user_id) {
      setInitialStep(2); 
    } else {
      setInitialStep(1);
    }
    
    setIsModalOpen(true);
  };

  const isGlobalView = currentBranch === 'all';
  const selectedBranchData = branches.find(b => String(b.id) === String(currentBranch));

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-between gap-4 pb-2 border-b border-gray-100 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800">Transaction Management Overview</h1>
          <p className="text-sm text-gray-500">
            {isGlobalView ? "Detailed sales and billing logs across all clinic branches" : `Transaction history for ${selectedBranchData?.name || 'Selected Branch'}`}
          </p>
        </div>

        {isClinicAdmin && (
          <div className="flex flex-col">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Select Branch</label>
            <select 
              value={currentBranch} 
              onChange={(e) => setCurrentBranch(e.target.value)}
              className="font-bold text-gray-700 bg-white border border-gray-300 py-2 rounded-lg px-4 outline-none cursor-pointer text-sm focus:ring focus:ring-black transition-all"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>(ID: {b.id}) {b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <TransactionCard summary={summary} />

      <div className="w-full">
        <TransactionTable 
          data={transactions} 
          loading={loading} 
          onRefresh={onRefresh}
          onViewDetails={handleViewDetails} 
          isGlobalView={isGlobalView} 
          isClinicAdmin={isClinicAdmin}
        />
      </div>

      {isModalOpen && selectedOwner && (
        <TransactionProfilingModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setSelectedOwner(null); }} 
          owner={selectedOwner}
          branchId={currentBranch}
          forcedStep={initialStep} 
        />
      )}
    </div>
  );
}