import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { LuX } from "react-icons/lu";

export default function Slider({ images = [] }) {
  const [selectedImg, setSelectedImg] = useState(null);
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });
  
  const x = useTransform(scrollYProgress, [0, 1], ["45%", "-85%"]);
  
  return (
    <div ref={ref} className="h-[300vh] bg-slate-900 relative">
      <div className="sticky top-[40px] flex items-center h-screen overflow-hidden z-10">
    <div ref={ref} className="h-[300vh] bg-slate-900 relative">
      <div className="sticky top-[40px] flex items-center h-screen overflow-hidden z-10">
        <motion.div style={{ x }} className="flex gap-8 px-4">
          {images.map((url, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedImg(url)} 
              className="transition-transform cursor-pointer active:scale-98"
            >
              <Card imgUrl={url} />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Normal Modal Section */}
      <AnimatePresence>
        {selectedImg && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-9999">
          <div className="fixed inset-0 flex items-center justify-center p-6 z-9999">
            {/* Backdrop - Click anywhere outside to close */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImg(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative z-10 flex flex-col items-center w-full max-w-6xl"
            >
              {/* Close Button above the image */}
              <button 
                onClick={() => setSelectedImg(null)}
                className="absolute right-0 transition-colors cursor-pointer -top-12 md:-right-10 text-white/70 hover:text-white"
              >
                <LuX size={40} />
              </button>
              
              {/* The "Whole Picture" Image */}
              <div className="flex justify-center w-full">
                <img
                  src={selectedImg}
                  className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
                  alt="manual-full-view"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Card({ imgUrl }) {
  return (
    <div className="relative w-[280px] sm:w-[400px] h-auto shrink-0">
      <img
        src={imgUrl}
        className="object-cover w-full h-full transition-all rounded-md"
        alt="card"
      />
    </div>
  );
}