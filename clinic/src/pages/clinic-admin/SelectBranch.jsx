import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
// hooks
import { useUI } from '../../hooks/useUI'
// utils
import wait from '../../utils/wait';
import { clearSession } from '../../utils/clearSession';
// components
import { authFetch } from '../../utils/authFetch';

import Button from '../../components/Button';
// icons
import { HiOutlineBuildingOffice2, HiPlus, HiArrowRight } from "react-icons/hi2";
import { IoLogOut } from "react-icons/io5";
import AddBranchModal from '../../components/AddBranchModal';
import BranchStatusModal from '../../components/BranchStatusModal';


const API_URL = import.meta.env.VITE_API_URL;

export default function SelectBranch() {
  const navigate = useNavigate();
  const { showLoader, hideLoader } = useUI();
  const [branches, setBranches] = useState([]);
  const [activeTab, setActiveTab] = useState('approved'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [isSelectedBranchModalOpen, setIsSelectedBranchModalOpen] = useState(false);

  const tabs = [
    { id: 'approved', label: 'Active' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
    { id: 'suspended', label: 'Suspended' },
  ];

  const fetchBranches = useCallback(async () => {
    showLoader();
    try {
      const response = await authFetch(`${API_URL}/api/clinic/clinic-admin/branches/get-branches.php`, {}, ['clinic_admin']);
      if(!response.success) {
        toast.error("Something went wrong");
        return;
      }
      setBranches(response.data);
    } catch(err) {
      console.error("Error fetching branches:", err);
      toast.error("Something went wrong");
    } finally {
      hideLoader();
    } 
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // add branch
  const handleSuccess = () => {
    setIsModalOpen(false); 
    setActiveTab('pending');
    fetchBranches();
  };
  // update branch
  const updateBranchSuccess = () => {
    setIsSelectedBranchModalOpen(false);
    setSelectedBranch(null);
    setActiveTab('pending');
    fetchBranches();
  };


  const filteredBranches = branches.filter(b => (b.status || b.branch_status) === activeTab);

  const handleSelect = async (branch) => {
    // approve branch
    if(activeTab === 'approved') {
      showLoader("Checking...")

      try {
        await wait(1000);
        const res = await authFetch(`${API_URL}/api/clinic/clinic-admin/subscription/check-subscription-history.php`, {
          method: 'POST',
          body: JSON.stringify({ branch_id: branch.branch_id })
        }, ['clinic_admin']);

        localStorage.setItem('active_clinic_id', branch.branch_id);
        if(res && res.hasSubHistory === true) {
          toast.info("Welcome");
          await wait(500);
          navigate(`/clinic/${branch.branch_id}/admin/dashboard`, { replace: true });
        } else {
          toast.info("Please select a subscription plan to get started.");
          await wait(500);
          navigate(`/clinic/${branch.branch_id}/admin/select-plan`, { replace: true });
        }
      } catch(error) {
        toast.error("Failed to verify branch status.");
        hideLoader();
      } finally {
        hideLoader();
      }

      // suspended
    } else if(activeTab === 'suspended') {
      toast.info("This branch is suspended. Please contact support.");
      return;

      // pending rejected
    } else {
      setSelectedBranch(branch);
      setIsSelectedBranchModalOpen(true);
      return;
    }
  }

  const handleLogout = async () => {
    showLoader("Logging out...");
    await wait(1500);
    clearSession();
    hideLoader();
    navigate('/clinic/login', { replace: true });
  };

  return (
    <>
      <div className="min-h-screen bg-(--clr-bg-page) flex flex-col">
        {/* nav */}
        <nav className="fixed top-0 left-0 z-50 w-full bg-(--clr-primary) border-b border-gray-300">
          <div className="flex items-center justify-between px-6 py-4 mx-auto container-xl">
            <span className="text-xl font-bold tracking-tight">LOGO</span>
           
            <button 
              type="button" 
              onClick={handleLogout}
              className="px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 cursor-pointer w-max text-(--clr-text-secondary) bg-(--clr-black) hover:scale-95 ease-in-out duration-500"
            >
              <IoLogOut size={18}/>
              Logout
            </button>
          </div>
        </nav>

        {/* content */}
        <section className="flex-1 w-full px-6 pt-32 pb-12 mx-auto container-xl">
          <div className="flex flex-col justify-between gap-4 mb-10 md:flex-row md:items-end">
            <header className="text-left">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-(--clr-text-primary) mb-3">My Branches</h1>
              <p className="text-lg text-gray-500">Manage and switch between your clinic locations.</p>
            </header>

            {/* add branch */}
            <Button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 transition-transform cursor-pointer h-max active:scale-95"
            >
              <HiPlus size={20} strokeWidth={2}/>
              Add New Branch
            </Button>
          </div>

          {/* tab */}
          <div className="flex justify-start mb-12 border-b border-gray-200">
            <div className="flex gap-4 sm:gap-12">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 px-2 text-sm font-bold transition-all relative cursor-pointer ${
                    activeTab === tab.id ? 'text-(--clr-primary)' : 'text-gray-400 hover:text-(--clr-text-primary)'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTab" 
                      className="absolute bottom-0 left-0 right-0 h-1 bg-(--clr-primary) rounded-t-full" 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* branches */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBranches.map((branch) => (
              <div
                key={branch.branch_id}
                onClick={() => handleSelect(branch)}
                className={`group relative bg-(--clr-bg-card) border border-gray-300 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 cursor-pointer hover:border-(--clr-primary)`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-50 text-(--clr-primary) rounded-2xl flex items-center justify-center group-hover:bg-(--clr-primary) group-hover:text-white transition-colors duration-300">
                      <HiOutlineBuildingOffice2 size={32} />
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                      activeTab === 'approved' ? 'bg-green-100 text-(--clr-text-header)' :
                      activeTab === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {branch.status || branch.branch_status}
                    </span>
                  </div>

                  {activeTab === 'approved' && (
                    <div className="mt-2 mb-4">
                      {!branch.end_date ? (
                        // new branch no subscription yet
                        <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-gray-100 text-gray-600 border border-gray-200">
                          NO ACTIVE SUBSCRIPTION
                        </span>
                        
                        /* active subscription */
                      ) : branch.days_left > 0 ? (          
                        <span className={`text-[11px] font-bold px-2 py-1 rounded-md border ${
                          branch.days_left <= 7 
                            ? 'bg-orange-50 text-orange-600 border-orange-200' 
                            : 'bg-green-100 text-(--clr-text-header) border-green-200'
                        }`}>
                          {branch.days_left} {branch.days_left === 1 ? 'DAY' : 'DAYS'} LEFT
                        </span>

                        /* expired subcription */
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200">
                          SUBSCRIPTION EXPIRED
                        </span>
                      )}
                    </div>
                  )}
                  
                  <h3 className="mb-2 text-2xl font-bold leading-tight text-gray-900">{branch.name || branch.branch_name}</h3>
                  <p className="flex-1 text-sm leading-relaxed text-gray-500">
                    {branch.address}, {branch.municipality}
                  </p>

                  <div className="flex items-center justify-between pt-5 mt-5 border-t border-gray-100">
                    <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">ID: {branch.branch_id}</span>
                    {activeTab === 'approved' && (
                      <div className="text-(--clr-primary) transform group-hover:translate-x-2 transition-transform duration-300">
                        <HiArrowRight size={24} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* if empty */}
          {filteredBranches.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center text-gray-400">
              <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-gray-50">
                <HiOutlineBuildingOffice2 size={40} className="opacity-20" />
              </div>
              <p className="text-xl font-medium">No {activeTab} branches found.</p>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <AddBranchModal
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSuccess={handleSuccess} 
          />
        )}

        {isSelectedBranchModalOpen && (
          <BranchStatusModal 
            branch={selectedBranch} 
            onClose={() => {
              setIsSelectedBranchModalOpen(false);
              setSelectedBranch(null);
            }}
            onSuccess={updateBranchSuccess} 
          />
        )}
      </AnimatePresence>
    </>
  );
}