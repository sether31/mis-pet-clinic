import { useState } from 'react';
import { toast } from 'react-toastify';
// hooks
import { useUser } from '../../../../hooks/useUser';
import { useUI } from '../../../../hooks/useUI';
// utils
import { authFetch } from '../../../../utils/authFetch';
// components
import InputImage from '../../../../components/InputImage'; 
// icons
import { HiXCircle, HiSave, HiBeaker, HiEye, HiDownload, HiTrash, HiArrowNarrowLeft } from 'react-icons/hi';
import { HiMiniExclamationCircle } from 'react-icons/hi2';
// image
import NoImage from '../../../../assets/images/no-image.jpg'


const API_URL = import.meta.env.VITE_API_URL;

export default function MedicalRecordModal({ record, onClose, onRefresh }) {
  const { showLoader, hideLoader } = useUI();
  const { user } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); 
  const [errors, setErrors] = useState({});
  const [petImgError, setPetImgError] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(record.record_type || 'unset');

  const [form, setForm] = useState({
    appointment_id: record.appointment_id,
    pet_id: record.pet_id,
    branch_id: record.branch_id,
    diagnosis: record.diagnosis || '',
    treatment: record.treatment || '',
    notes: record.notes || '',
    category: record.record_type || 'unset', 
    status: record.status || 'unrecorded',
    image_1: null,
    image_2: null,
    doc_1: null,
    doc_2: null
  });

  const getAvatarUrl = (name) => {
    const bg = 'd1fae5';
    const color = '42756C';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=${bg}&color=${color}&bold=true`;
  };

  // check if authorized to edit
  const isClinicAdmin = user?.role === 'clinic_admin';
  const isUnauthorizedBranch = !isClinicAdmin && Number(user?.branch_id) !== Number(record.branch_id);

  // check if there is medical data worth warning about
  const handleToggleAttempt = () => {
    const isMovingToNonMedical = currentCategory === 'medical';
    
    // check state or if have existing data
    const hasData = 
      form.diagnosis.trim() || 
      form.treatment.trim() || 
      record.med_image_1 || 
      record.med_doc_1;

    if(isMovingToNonMedical && hasData) {
      setShowConfirm(true); 
    } else {
      executeToggle();
    }
  };

  const executeToggle = () => {
    let nextCat;
    if (currentCategory === 'unset' || currentCategory === 'unrecorded') {
      nextCat = 'medical'; // First click defaults to medical
    } else {
      nextCat = currentCategory === 'medical' ? 'non_medical' : 'medical';
    }

    setCurrentCategory(nextCat);
    setShowConfirm(false);
    
    setForm(prev => {
      const isNonMedical = nextCat === 'non_medical';
      
      return {
        ...prev,
        category: nextCat,
        diagnosis: isNonMedical ? '' : prev.diagnosis,
        treatment: isNonMedical ? '' : prev.treatment,
        image_1: isNonMedical ? null : prev.image_1,
        image_2: isNonMedical ? null : prev.image_2,
        doc_1: isNonMedical ? null : prev.doc_1,
        doc_2: isNonMedical ? null : prev.doc_2,
      };
    });

    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    const val = type === "file" ? files[0] : value;
    
    setForm(prev => ({ ...prev, [name]: val }));

    if (name === "diagnosis" && currentCategory === 'medical') {
      setErrors(prev => ({ ...prev, diagnosis: val.trim() ? "valid" : "Diagnosis is required." }));
    }
  };

  const handleDownload = (path) => {
    if(!path) {
      toast.error("No file found.");
      return;
    }
    
    const downloadUrl = `${API_URL}/api/clinic/general/medical/download.php?path=${encodeURIComponent(path)}`;
    
    // this triggers the download immediately
    window.location.href = downloadUrl;
  };

  const handleSubmit = async (e) => {
    if(e) e.preventDefault();

    if (currentCategory === 'unset' || currentCategory === 'unrecorded') {
      toast.error("Please select a Record Type first.");
      return;
    }
    
    if(currentCategory === 'medical' && !form.diagnosis.trim()) {
      setErrors(prev => ({ ...prev, diagnosis: "Diagnosis is required for medical records." }));
      toast.error("Diagnosis is required.");
      return;
    }

    showLoader('Saving Record...');
    setIsSubmitting(true);

    const fd = new FormData();
    
    // remove records when non medical
    const submissionData = {
      ...form,
      record_type: currentCategory,
      status: 'recorded',
      diagnosis: currentCategory === 'non_medical' ? '' : form.diagnosis,
      treatment: currentCategory === 'non_medical' ? '' : form.treatment
    };

    Object.keys(submissionData).forEach(key => {
      if(submissionData[key] !== null) {
        fd.append(key, submissionData[key]);
      }
    });

    try {
      const response = await authFetch(`${API_URL}/api/clinic/general/medical/save-medical-record.php`, {
        method: 'POST',
        body: fd, 
      });

      if (response.success) {
        toast.success(`Record saved as ${currentCategory.replace('_', ' ')}`);
        onRefresh();
        onClose();
      } else {
        toast.error(response.message || "Failed to save record.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      hideLoader();
      setIsSubmitting(false);
    }
  };

  const formattedDateUpdate = record.updated_at 
    ? new Date(record.updated_at).toLocaleString('en-US', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      }) 
    : "--:--";

  const formattedDateScheduled = record.start_time 
    ? new Date(record.start_time).toLocaleDateString('en-US', { 
        month: 'long', 
        day: '2-digit', 
        year: 'numeric' 
      }) 
    : "--:--";

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-[110] bg-gray-900/60 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[95vh] overflow-hidden bg-white rounded-2xl border border-gray-300">
        
        {/* check if switching to non medical */}
        {showConfirm && (
          <div className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-md flex items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-red-600 bg-red-100 rounded-full">
                <HiTrash size={32} />
              </div>
              <h3 className="mb-2 text-xl italic font-black leading-tight text-gray-800 uppercase">Wipe Medical Data?</h3>
              <p className="mb-8 text-sm font-medium leading-relaxed text-gray-500">
                Switching to <span className="font-bold text-amber-600">Non-Medical</span> will permanently clear all diagnosis, treatments, and uploaded files.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={executeToggle}
                  className="w-full py-4 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all active:scale-95 cursor-pointer duration-300 ease-in-out"
                >
                  Confirm and Wipe
                </button>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="w-full py-4 bg-gray-100 text-gray-500 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-95 cursor-pointer duration-300 ease-in-out"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* main modal */}
        <div className="flex items-center justify-between p-5 bg-white border-b sm:p-6">
          {/* header */}
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl text-white transition-colors duration-300 ${currentCategory === 'non_medical' ? 'bg-amber-500' : 'bg-(--clr-primary)'}`}>
              <HiBeaker size={20}/>
            </div>
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight text-gray-800 uppercase">
                {currentCategory.replace('_', ' ')} Record
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                  REF: {record.appointment_id}
                </p>
                <span className="text-[10px] text-gray-300">|</span>
                <p className="text-[10px] font-black text-(--clr-primary) uppercase tracking-widest leading-none">
                  SCHEDULED: {formattedDateScheduled}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 transition-all cursor-pointer hover:text-red-500 active:scale-90"
          >
            <HiXCircle className="w-8 h-8"/>
          </button>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="relative p-5 space-y-6 overflow-y-auto sm:p-8">
          {/* patient info */}
          <div className="flex flex-col p-4 rounded-2xl">
            {/* pet & owner */}
            <div className="flex items-center col-span-2 gap-4 px-2 pb-4 pr-2 border-b border-gray-300">
              <a 
                href={record.pet_picture ? `${API_URL}/${record.pet_picture}` : ''} 
                target="_blank" 
                onClick={(e) => !record.pet_picture && e.preventDefault()}
                rel="noreferrer"
                className="relative group"
                title="View full image"
              >
                <img 
                  src={record.pet_picture && !petImgError
                    ? `${API_URL}/${record.pet_picture}` 
                    : getAvatarUrl(record.pet_name, 'pet')
                  } 
                  className="object-cover w-16 h-16 bg-white rounded-2xl"
                  onError={(e) => {
                    if(!petImgError) {
                      setPetImgError(true);
                      e.target.src = NoImage;
                    }
                  }}
                  alt="pet"
                />
              </a>
              <div>
                <span className="text-[9px] font-black text-gray-700 uppercase leading-none block mb-1">Patient & Owner</span>
                <h3 className="text-sm font-black leading-none uppercase">{record.pet_name}</h3>
                <p className="text-[10px] font-bold text-(--clr-primary) italic mt-0.5">{record.owner_name}</p>
              </div>
            </div>

            {/* service and staff */}
            <div className="grid grid-cols-2 gap-4 px-2 py-4 border-b border-gray-300">
              <div className="flex flex-col justify-center">
                <span className="text-[9px] font-black text-gray-700 uppercase leading-none mb-1">Service & Branch</span>
                <p className="text-[11px] font-black uppercase leading-tight">
                  {record.current_service_name || record.service_name_at_time}
                </p>
                <p className="text-[9px] font-bold text-(--clr-primary) uppercase tracking-tighter">
                  {record.branch_name || 'Branch Name'}
                </p>
                <p className="text-[9px] font-bold text-(--clr-primary) uppercase tracking-tighter truncate">
                  {record.branch_address || record.address || 'Branch Address'}
                </p>
              </div>

              <div className="flex flex-col justify-center pl-4 border-l border-gray-200">
                <span className="text-[9px] font-black text-gray-700 uppercase leading-none mb-1">Assigned & Price</span>
                <p className="text-[11px] font-black uppercase leading-tight truncate">
                  {record.staff_name || 'Unassigned'}
                </p>
                <p className="text-[10px] font-black text-(--clr-primary)">
                  ₱{parseFloat(record.service_price_at_time || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* category */}
          <div className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${currentCategory === 'non_medical' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-colors ${currentCategory === 'non_medical' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <HiMiniExclamationCircle size={20}/>
              </div>
              <div className="pr-4">
                <h4 className="text-[10px] font-black uppercase text-gray-800 tracking-wide">Record Type</h4>
                <p className="text-[11px] text-gray-500 leading-tight">Switch for general services.</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={handleToggleAttempt}
              disabled={isUnauthorizedBranch}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all border whitespace-nowrap active:scale-95 cursor-pointer
                ${currentCategory === 'unset' 
                  ? 'bg-white border-red-500 text-red-500' 
                  : currentCategory === 'non_medical' 
                    ? 'bg-amber-500 border-amber-600 text-white'
                    : 'bg-(--clr-primary) border-(--clr-primary) text-white'}`}
            >
              {currentCategory === 'unset' ? 'Select Record Type' : 
              currentCategory === 'non_medical' ? 'Set to Medical' : 'Set to Non-Medical'}
            </button>
          </div>

          {/* medical forms */}
          <div className={`space-y-4 text-left transition-all duration-300 ${currentCategory === 'non_medical' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex flex-col gap-1.5">
              <label className="ml-1 text-sm font-medium text-gray-700">
                Diagnosis {currentCategory === 'medical' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                name="diagnosis" 
                rows="3"
                disabled={isUnauthorizedBranch}
                className={`w-full px-4 py-3 text-sm border rounded-xl outline-none transition-all resize-none font-medium disabled:cursor-not-allowed ${
                  errors.diagnosis === "valid" 
                  ? "border-(--clr-primary)" 
                  : errors.diagnosis 
                    ? "border-red-500" 
                    : "border-gray-300 focus:border-gray-800"
                } ${currentCategory === 'non_medical' ? 'bg-gray-100' : 'bg-white'}`}
                placeholder={currentCategory === 'medical' ? "Enter medical diagnosis..." : "N/A - This is a non-medical record."}
                value={form.diagnosis}
                onChange={handleChange}
              />
              {errors.diagnosis && errors.diagnosis !== "valid" && (
                <p className="text-[10px] text-red-500 font-bold uppercase ml-1">{errors.diagnosis}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="ml-1 text-sm font-medium text-gray-700">Treatment & Prescription</label>
              <textarea
                name="treatment"
                rows="3"
                disabled={isUnauthorizedBranch}
                className={`w-full px-4 py-3 text-sm font-medium transition-all border outline-none resize-none border-gray-300 rounded-xl focus:border-gray-800 disabled:cursor-not-allowed ${
                  currentCategory === 'non_medical' ? 'bg-gray-100' : 'bg-white'
                }`}
                placeholder={currentCategory === 'medical' ? "Prescribed meds or procedures..." : "N/A"}
                value={form.treatment}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* attachments */}
          <div className={`pt-2 text-left transition-all duration-300 ${currentCategory === 'non_medical' ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
            <h1 className="mb-1 ml-1 text-sm font-medium text-gray-700">
              Files & Media
            </h1>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InputImage 
                  label="Photo 1" 
                  name="image_1"
                  disabled={isUnauthorizedBranch} 
                  onChange={handleChange} 
                  isPreview={true} 
                  existingImage={record.med_image_1} 
                />
                <InputImage 
                  label="Photo 2" 
                  name="image_2"
                  disabled={isUnauthorizedBranch} 
                  onChange={handleChange} 
                  isPreview={true} 
                  existingImage={record.med_image_2} 
                />
              </div>

              {/* file */}
              <div className="grid grid-cols-1 gap-4 space-y-3 md:grid-cols-2">
                {[1, 2].map(n => {
                  const hasFile = record[`med_doc_${n}`];
                  return (
                    <div key={n} className="flex flex-col p-4 transition-colors border border-gray-100 bg-gray-50 rounded-2xl hover:border-gray-300">
                      <label className="mb-1 ml-1 text-sm font-medium text-gray-600">Document 0{n} (.pdf)</label>
                      <input 
                        type="file" 
                        name={`doc_${n}`} 
                        disabled={isUnauthorizedBranch} 
                        accept=".pdf" 
                        onChange={handleChange} 
                        className="text-[10px] file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[9px] file:font-black file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 file:cursor-pointer disabled:cursor-not-allowed" 
                      />
                      {hasFile && (
                        <div className="flex items-center gap-2 mt-3">
                          <a href={`${API_URL}/${hasFile}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-300 rounded-lg text-[9px] font-bold text-gray-600">
                            <HiEye size={12}/> VIEW
                          </a>
                          <button type="button" onClick={() => handleDownload(hasFile)} className="flex items-center gap-1 px-3 py-1 cursor-pointer active:scale-95 bg-black rounded-lg text-[9px] font-bold text-white">
                            <HiDownload size={12}/> DOWNLOAD
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {!isUnauthorizedBranch ? (
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full py-4 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer ease-in-out duration-300
                ${currentCategory === 'non_medical' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-(--clr-primary)/95 hover:bg-(--clr-primary)'}`}
            >
              <HiSave size={18}/> {isSubmitting ? "Processing..." : `Save ${currentCategory.replace('_', ' ')}`}
            </button>
          ) : (
            <div className="flex items-center justify-center w-full gap-2 py-4 text-[10px] font-black text-amber-600 uppercase border border-amber-200 bg-amber-50 rounded-xl">
              <HiMiniExclamationCircle size={18}/> Read-Only: Different Branch Record
            </div>
          )}

          <div className="flex items-center justify-between pt-4 mt-6 border-t border-gray-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                {/* date */}
                <p className="text-[10px] font-bold text-gray-700 uppercase italic">
                  Last Updated: {record.updated_at ? formattedDateUpdate : '---'}
                </p>
                
                <span className="text-gray-300">|</span>
                
                {/* staff */}
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-black uppercase ${!record.updated_by_staff_name ? 'text-amber-500' : 'text-(--clr-primary)'}`}>
                    Updated By: {record.updated_by_staff_name || (typeof record.updated_by === 'string' ? record.updated_by : 'No record yet')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}