export default function InfiniteBanner({ items = [], direction = "left" }) {
  const trackItems = [...items, ...items, ...items];


  const animationClass = direction === "right" ? "animate-infinite-scroll-right" : "animate-infinite-scroll-left";

  return (
    <section className="relative flex w-full py-4 overflow-hidden cursor-not-allowed banner-section bg-slate-900 border-y border-slate-800">
      
      <div className={`flex w-max ${animationClass}`}>      
        <div className="flex items-center w-max">
          {trackItems.map((item, i) => (
            <div key={`t1-${i}`} className="flex items-center px-8 sm:px-12">
              <span className="text-xs font-bold tracking-widest uppercase text-slate-300 whitespace-nowrap">
                {item.name}
              </span>
              <span className="ml-8 text-slate-700 sm:ml-12">•</span>
            </div>
          ))}
        </div>

        <div className="flex items-center w-max" aria-hidden="true">
          {trackItems.map((item, i) => (
            <div key={`t2-${i}`} className="flex items-center px-8 sm:px-12">
              <span className="text-xs font-bold tracking-widest uppercase text-slate-300 whitespace-nowrap">
                {item.name}
              </span>
              <span className="ml-8 text-slate-700 sm:ml-12">•</span>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes scroll-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        .animate-infinite-scroll-left {
          animation: scroll-left 90s linear infinite; 
        }

        .animate-infinite-scroll-right {
          animation: scroll-right 90s linear infinite; 
        }
        
        .banner-section:hover .animate-infinite-scroll-left,
        .banner-section:hover .animate-infinite-scroll-right {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}