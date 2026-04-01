import { useState } from "react";
import { LuPlus, LuMinus } from "react-icons/lu";


export default function FAQ({ faqData = [] }) {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-white">
      <div className="max-w-3xl px-4 mx-auto">
        <h2 className="mb-12 text-3xl font-black text-center md:text-4xl text-slate-900">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {faqData.map((item, i) => (
            <div key={i} className="overflow-hidden transition-all border border-slate-100 rounded-2xl">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full p-6 text-left transition-colors bg-white cursor-pointer hover:bg-slate-50"
              >
                <span className="font-bold text-slate-800">{item.q}</span>
                {openIndex === i ? <LuMinus className="text-blue-600" /> : <LuPlus className="text-slate-400" />}
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="p-6 pt-0 leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}