import React, { ReactNode } from 'react';
import { LucideIcon, Ghost } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, message, action }) => {
  const IconComponent = Icon as any;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-20 text-center"
    >
      <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-dashed border-slate-100">
        {!IconComponent ? (
          <Ghost size={48} />
        ) : React.isValidElement(IconComponent) ? (
          IconComponent
        ) : (
          <IconComponent size={48} />
        )}
      </div>
      
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
      <p className="text-slate-400 mt-2 text-sm font-medium max-w-xs mx-auto leading-relaxed">
        {message}
      </p>

      {action && (
        <button 
          onClick={action.onClick}
          className="mt-8 px-8 h-12 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;
