import { useState } from 'react';
// sub components
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal'; 

export default function ClinicAdminView({ 
  transactions, 
  summary, 
  loading, 
  onRefresh, 
  branches = [], 
  currentBranch, 
  setCurrentBranch, 
  isClinicAdmin 
}) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  // check if global
  const isGlobalView = currentBranch === 'all';
  // find current branch
  const selectedBranchData = branches.find(b => String(b.id) === String(currentBranch));

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col items-center justify-between gap-4 pb-2 border-b border-gray-100 md:flex-row">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction Management Overview</h1>
          <p className="text-gray-500">
            {isGlobalView 
              ? "Detailed sales and billing logs across all clinic branches" 
              : `Transaction history for ${selectedBranchData?.name || 'Selected Branch'}`
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* show only on clinic admin */}
          {isClinicAdmin && (
            <div className="flex flex-col pr-4">
              <label className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                Select Branch
              </label>
              <select 
                value={currentBranch} 
                onChange={(e) => setCurrentBranch(e.target.value)}
                className="font-bold text-gray-800 bg-transparent border border-gray-300 py-2 rounded-lg px-4 outline-none cursor-pointer text-sm min-w-[160px]"
              >
                <option value="all">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    (ID: {b.id}) {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* card */}
      <TransactionCard summary={summary} />

      {/* table */}
      <div className="w-full">
        <TransactionTable 
          data={transactions} 
          loading={loading} 
          onRefresh={onRefresh}
          onViewDetails={handleViewDetails}
          isGlobalView={isGlobalView} 
        />
      </div>

      {/* modal */}
      {isModalOpen && selectedTransaction && (
        <TransactionModal 
          transaction={selectedTransaction} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}