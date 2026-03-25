import { motion } from 'framer-motion';
import notFoundPic from '../assets/images/notFound.gif';
import { RiMailLine, RiPhoneLine } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';

export default function PlatformMaintenance({ message, platformEmail, contactPhone }) {  
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason");

  return (
    <div className='flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center bg-(--clr-bg-page)'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg"
      >
        {reason === 'maintenance' && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">System Maintenance</p>
            <p className="text-sm">Your last action was not saved because the system is being updated.</p>
          </div>
        )}

        <div className="relative mb-8">
          <img 
            src={notFoundPic} 
            alt="Corgi pic" 
            className='w-64 h-auto rounded-2xl grayscale-[50%]' 
          />
          
          <div className="absolute -bottom-4 -right-4 bg-orange-500 text-white font-black px-4 py-2 rounded-lg transform rotate-12 shadow-lg">
            BRB
          </div>
        </div>

        <h1 className='mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl text-(--clr-text-header)'>
          We'll be right back!
        </h1>
        
        <p className='mb-6 text-lg leading-relaxed text-gray-500'>
          {message || "The platform is currently undergoing scheduled maintenance to improve our services."}
        </p>

        {/* CLICKABLE CONTACT INFO */}
        <div className="flex flex-col gap-3 mb-10 text-sm">
          {platformEmail && (
            <a 
              href={`mailto:${platformEmail}`} 
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-(--clr-primary) transition-colors"
            >
              <RiMailLine className="text-lg" /> 
              <span className="underline decoration-gray-300 underline-offset-4">{platformEmail}</span>
            </a>
          )}
          
          {contactPhone && (
            <a 
              href={`tel:${contactPhone.replace(/\s+/g, '')}`} 
              className="flex items-center justify-center gap-2 text-gray-500 hover:text-(--clr-primary) transition-colors"
            >
              <RiPhoneLine className="text-lg" /> 
              <span className="underline decoration-gray-300 underline-offset-4">{contactPhone}</span>
            </a>
          )}
        </div>

        <button 
          onClick={() => window.location.reload()}
          className='px-8 py-3 font-bold rounded-xl bg-(--clr-primary) text-white hover:-translate-y-1 transition-all duration-300 active:scale-95 cursor-pointer' 
        >
          Check Again
        </button>
      </motion.div>
    </div>
  );
}