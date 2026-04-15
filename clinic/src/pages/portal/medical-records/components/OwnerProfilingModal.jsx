import { useState, useEffect, useCallback } from 'react';
import { HiChevronLeft, HiOutlineBeaker, HiXCircle, HiClipboardList, HiShieldCheck, HiDownload } from 'react-icons/hi';
import { toast } from 'react-toastify';
import { authFetch } from '../../../../utils/authFetch';
import NoImage from '../../../../assets/images/no-image.jpg';
import LoaderV2 from '../../../../components/LoaderV2';

const API_URL = import.meta.env.VITE_API_URL;

export default function OwnerProfilingModal({ isOpen, onClose, ownerId, ownerName, ownerPicture, branchId, onEditRecord }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedService, setSelectedService] = useState(null);

  const getImageUrl = (path) => {
    if (!path) return null;
    const cleanBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  };

  const getAvatarUrl = (name) => {
    const bg = 'd1fae5';
    const color = '065f46';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}&bold=true`;
  };

  const fetchPets = useCallback(async () => {
    if (!ownerId) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/medical/profiling-actions.php?action=get_pets&owner_id=${ownerId}&branch_id=${branchId}`);
      setPets(res?.data || []);
    } catch (err) {
      toast.error("Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedPet(null);
      setSelectedService(null);
      fetchPets();
    }
  }, [isOpen, fetchPets]);

  const handleSelectPet = async (pet) => {
    setSelectedPet(pet);
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/medical/profiling-actions.php?action=get_pet_services&pet_id=${pet.pet_id}&branch_id=${branchId}`);
      setServices(res?.data || []);
      setStep(2);
    } catch (err) {
      toast.error("Failed to load services");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectService = async (service) => {
    setSelectedService(service);
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/clinic/general/medical/profiling-actions.php?action=get_service_history&pet_id=${selectedPet.pet_id}&service_id=${service.service_id}&branch_id=${branchId}`);
      setHistory(res?.data || []);
      setStep(3);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) { setStep(1); setSelectedPet(null); }
  };

  if (!isOpen) return null;
  
  const currentBranchName = history[0]?.branch_name || "Clinic Branch";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl border border-gray-300">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 bg-white border-b sm:p-6 shrink-0">
          <div className="flex items-center gap-3">
            {step > 1 ? (
              <button onClick={goBack} className="p-2 text-gray-500 transition-all bg-gray-200 cursor-pointer rounded-xl hover:bg-gray-300 active:scale-90">
                <HiChevronLeft size={20} />
              </button>
            ) : (
              <div className="p-2 text-white bg-(--clr-primary) rounded-xl">
                <HiClipboardList size={20} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight text-gray-800 uppercase">Owner Profiling</h2>
              <p className="text-[10px] font-black text-(--clr-primary) uppercase tracking-widest mt-1">
                {currentBranchName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 transition-all cursor-pointer hover:text-red-500 active:scale-90">
            <HiXCircle className="w-8 h-8" />
          </button>
        </div>

        {/* BREADCRUMBS */}
        <div className="flex items-center gap-2 px-6 py-3 shrink-0">
          {['Patient', 'Service', 'Records'].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter whitespace-nowrap transition-all ${step >= idx + 1 ? 'text-(--clr-primary)' : 'text-gray-400'}`}>
                0{idx + 1}. {label}
              </div>
              {idx < 2 && <span className="text-gray-300">/</span>}
            </div>
          ))}
        </div>

        {/* CONTENT AREA */}
        <div className="relative p-5 space-y-4 overflow-y-auto sm:p-8 min-h-[520px]">
          
          <div className="flex items-start gap-4 p-4 border border-gray-400 rounded-2xl bg-gray-50/50">
            <img 
              src={selectedPet ? (getImageUrl(selectedPet.pet_picture) || getAvatarUrl(selectedPet.name)) : (getImageUrl(ownerPicture) || getAvatarUrl(ownerName))}
              className="object-cover bg-white border border-gray-200 w-14 h-14 rounded-2xl shrink-0" 
              alt="avatar" 
              onError={(e) => { e.target.src = NoImage; }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black text-(--clr-primary) uppercase leading-none block mb-1 tracking-widest">
                {selectedPet ? 'Patient Profile' : 'Selected Owner'}
              </span>
              <h3 className="text-sm font-black leading-none text-gray-800 uppercase truncate">
                {selectedPet ? selectedPet.name : ownerName}
              </h3>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                  {selectedPet ? `ID: ${selectedPet.pet_id || '---'} Species: ${selectedPet.species || 'N/A'}` : `ID: #${ownerId || '---'}`}
                </p>
                {selectedPet && (
                  <>
                    <span className="text-gray-300 text-[10px]">|</span>
                    <p className="text-[10px] font-bold text-(--clr-primary)/70 uppercase tracking-tighter italic">Owner: {ownerName}</p>
                  </>
                )}
              </div>

              {selectedPet && (
                <div className="flex items-center gap-1.5 mt-2">
                  <HiShieldCheck className="text-(--clr-primary)" size={14}/>
                  <p className="text-[10px] font-black text-gray-700 uppercase tracking-tight">
                    Condition: <span className="text-(--clr-primary)">{selectedPet.medical_conditions || 'No Chronic Conditions'}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {isLoading ? (
            <LoaderV2 />
          ) : (
            <div className="pb-12"> 
              {step === 1 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {pets.map(pet => (
                    <div key={pet.pet_id} onClick={() => handleSelectPet(pet)} className="flex items-center gap-4 p-4 transition-all bg-white border border-gray-400 rounded-2xl hover:border-black cursor-pointer active:scale-98 min-h-[85px]">
                      <img src={getImageUrl(pet.pet_picture) || getAvatarUrl(pet.name)} className="object-cover w-12 h-12 bg-gray-50 rounded-xl" alt={pet.name} onError={(e) => { e.target.src = NoImage; }} />
                      <div className="overflow-hidden">
                        <p className="text-[11px] font-black uppercase text-gray-800 truncate">{pet.name}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{pet.species || 'Patient'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest leading-none">Select Category</h4>
                    <button 
                      onClick={() => window.open(`${API_URL}/api/clinic/general/medical/generate-full-history-pdf.php?pet_id=${selectedPet.pet_id}&branch_id=${branchId}`, '_blank')}
                      className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 active:scale-98 transition-all cursor-pointer"
                    >
                      <HiDownload size={14} /> Download All Records
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {services.map(service => (
                      <div key={service.service_id} onClick={() => handleSelectService(service)} className="flex flex-col items-center justify-center p-6 text-center transition-all bg-white border border-gray-400 rounded-2xl hover:border-black hover:bg-green-50/30 cursor-pointer active:scale-98 min-h-[140px]">
                        <div className="p-3 mb-3 rounded-full text-(--clr-primary) bg-green-100"><HiOutlineBeaker size={24} /></div>
                        <p className="text-[10px] font-black uppercase leading-tight text-gray-800">{service.service_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-gray-800 tracking-widest leading-none">Record History</h4>
                      <p className="text-[9px] font-bold text-(--clr-primary) uppercase mt-1">Service: {selectedService?.service_name}</p>
                    </div>
                    <button onClick={() => window.open(`${API_URL}/api/clinic/general/medical/generate-medical-pdf.php?pet_id=${selectedPet.pet_id}&service_id=${selectedService.service_id}&branch_id=${branchId}`, '_blank')} className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 active:scale-98 transition-all cursor-pointer"><HiDownload size={14} /> Download Service Records</button>
                  </div>
                  
                  <div className="space-y-3">
                    {history.length > 0 ? history.map((rec, i) => {
                      // Use record_type from the database to determine the medical status
                      const recordType = (rec.record_type || '').toLowerCase();
                      const diagRaw = (rec.diagnosis || '').trim();
                      
                      // Default fallbacks
                      let typeLabel = 'Unknown';
                      let typeColor = 'bg-gray-100 text-gray-500';
                      let displayDiag = diagRaw || 'No Diagnosis recorded';
                      let displayTreat = rec.treatment || 'No treatment details';

                      // Map the visual labels and colors based on record_type
                      if (recordType === 'medical') {
                        typeLabel = 'Medical Record';
                        typeColor = 'bg-green-100 text-(--clr-primary)';
                      } else if (recordType === 'unset') {
                        typeLabel = 'Unrecorded';
                        typeColor = 'bg-gray-100 text-gray-500'; 
                        displayDiag = 'N/A';
                        displayTreat = 'N/A';
                      } else if (recordType === 'non_medical') {
                        typeLabel = 'Non-Medical';
                        typeColor = 'bg-amber-100 text-amber-600';
                        displayDiag = 'N/A';
                        displayTreat = 'N/A';
                      } 

                      return (
                        <div 
                          key={i} 
                          onClick={() => onEditRecord(rec)}
                          className="p-5 border border-gray-400 bg-gray-50 rounded-2xl min-h-[100px] cursor-pointer hover:border-black hover:bg-green-50/30 transition-all group active:scale-[0.98]"
                        >
                          <div className="flex items-center justify-between pb-2 mb-4 border-b border-gray-200/60">
                            <div className="flex gap-2">
                              <span className="text-[10px] font-black text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded uppercase">
                                {new Date(rec.record_date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${typeColor}`}>
                                {typeLabel}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter group-hover:text-black">Edit/VIEW Record &rarr;</span>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-[9px] font-black text-gray-700 uppercase mb-1">Medical Condition & Diagnosis</p>
                              <p className={`text-[11px] font-bold leading-snug ${typeLabel === 'Unrecorded' ? 'text-gray-400' : 'text-gray-600'}`}>
                                {displayDiag}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] font-black text-gray-700 uppercase mb-1">Treatment & Plan</p>
                              <p className={`text-[11px] font-medium leading-snug line-clamp-2 ${typeLabel === 'Unrecorded' ? 'text-gray-300' : 'text-gray-600'}`}>
                                {displayTreat}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-10 text-center border-2 border-gray-200 border-dashed rounded-2xl">
                        <p className="text-[10px] font-black text-gray-400 uppercase">No medical records found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-5 bg-white border-t border-gray-100 shrink-0">
           <p className="text-[9px] font-bold text-gray-400 uppercase">
             {selectedPet ? `Patient: ${selectedPet.name}` : `Owner: ${ownerName}`}
           </p>
           <button onClick={onClose} className="px-6 py-2 text-gray-500 bg-gray-100 rounded-xl text-[10px] font-black uppercase hover:bg-gray-200 transition-all cursor-pointer">Close Explorer</button>
        </div>
      </div>
    </div>
  );
}