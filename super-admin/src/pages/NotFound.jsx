import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
// image
import notFoundPic from '../assets/images/notFound.gif';

export default function NotFound() {  
  return (
    <div className='flex flex-col items-center justify-center min-h-screen px-6 py-12 text-center bg-(--clr-bg-page)'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center max-w-lg"
      >
        <div className="relative mb-8">
           <img 
            src={notFoundPic} 
            alt="Page not found" 
            className='w-64 h-auto rounded-2xl grayscale-[50%]' 
          />
          
          <div className="absolute -bottom-4 -right-4 bg-(--clr-primary) text-(--clr-text-secondary) font-black px-4 py-2 rounded-lg transform rotate-12 shadow-lg">
            404
          </div>
        </div>

        <h1 className='mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl'>
          Lost in the Clinic?
        </h1>
        
        <p className='mb-10 text-lg leading-relaxed text-gray-500'>
          The page you’re looking for doesn’t exist.
        </p>

        <Link 
          className='px-8 py-3 font-bold rounded-xl bg-(--clr-primary) text-(--clr-text-secondary) hover:-translate-y-1 transition-all duration-300 ease-in-out' 
          to="/login"
        >
          Back to Login
        </Link>
      </motion.div>
    </div>
  );
}