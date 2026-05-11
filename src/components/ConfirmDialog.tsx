import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  isLoading 
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm shadow-2xl relative z-10 text-center"
          >
            <button 
              onClick={onCancel}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
            >
              <X size={20} />
            </button>

            <div className="mx-auto w-20 h-20 bg-red-50 text-red-600 rounded-[2.2rem] flex items-center justify-center mb-6 border-4 border-white shadow-xl shadow-red-600/10">
              <AlertCircle size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{title}</h2>
            <p className="text-slate-500 mb-10 leading-relaxed text-sm font-medium">
              {message}
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={onCancel}
                className="px-4 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={onConfirm}
                disabled={isLoading}
                className="px-4 py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 hover:bg-red-700 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
