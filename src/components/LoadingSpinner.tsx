import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-[9999]">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl border-4 border-primary-100 border-t-primary-600 animate-spin" />
          <Loader2 className="absolute inset-0 m-auto text-primary-600 animate-pulse" size={24} />
        </div>
        <p className="mt-6 text-sm font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Synchronizing Neural ERP...
        </p>
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
