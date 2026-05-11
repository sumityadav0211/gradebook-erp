import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { motion } from 'motion/react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="relative mb-12">
          <div className="text-[12rem] font-black text-slate-100 select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
             <motion.div
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="p-6 bg-white rounded-[3rem] shadow-2xl shadow-indigo-600/10 border-4 border-slate-50"
             >
               <Compass size={80} className="text-secondary-600" />
             </motion.div>
          </div>
        </div>

        <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Coordinates Lost</h1>
        <p className="text-slate-500 font-medium mb-12 leading-relaxed">
          The academic record or department you're attempting to access doesn't exist in our current database index.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
           <button 
             onClick={() => navigate(-1)}
             className="flex-1 flex items-center justify-center gap-3 h-14 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-50 transition-all text-xs uppercase tracking-widest"
           >
             <ArrowLeft size={18} />
             <span>Go Back</span>
           </button>
           <button 
             onClick={() => navigate('/')}
             className="flex-1 flex items-center justify-center gap-3 h-14 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 text-xs uppercase tracking-widest"
           >
             <Home size={18} />
             <span>Command Center</span>
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
