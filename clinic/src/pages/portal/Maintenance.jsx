import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// images
import maintenancePic from '../../assets/images/notFound.gif'; 
// utils
import wait from '../../utils/wait';
import { useUI } from '../../hooks/useUI';

export default function Maintenance({ onRefresh }) {
  const navigate = useNavigate();
  const { showLoader, hideLoader} = useUI();
  
  const logout = async () => {
    showLoader("Logging out...");
    sessionStorage.removeItem("access_token");
    await wait(1000);
    hideLoader();
    navigate("/clinic/login");
  }
  return (
    <div className='flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center bg-gray-50'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg"
      >
        <div className="relative mb-8">
          <img 
            src={maintenancePic} 
            alt="Under Maintenance" 
            className='w-64 h-auto rounded-2xl grayscale-[50%]' 
          />
          
          <div className="absolute px-4 py-2 font-black tracking-widest text-white uppercase transform rounded-lg shadow-lg -bottom-4 -right-4 bg-amber-500 rotate-12">
            BRB
          </div>
        </div>

        <h1 className='mb-4 text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl'>
          Clinic Under Maintenance
        </h1>
        
        <p className='mb-10 text-lg leading-relaxed text-gray-500'>
          We're currently updating the clinic. <br />
          Please check back in a few minutes.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <button 
            onClick={onRefresh}
            className='px-8 py-3 font-bold text-white transition-all duration-300 cursor-pointer rounded-xl bg-amber-500 hover:bg-amber-600 hover:-translate-y-1'
          >
            Refresh Page
          </button>

          <button 
            onClick={logout}
            className='px-8 py-3 font-bold text-gray-600 transition-all duration-300 border-2 border-gray-300 cursor-pointer rounded-xl hover:bg-gray-100'
          >
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}