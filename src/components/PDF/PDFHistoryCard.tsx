import React from 'react';
import { FileText, Download, ExternalLink, Trash2, Calendar, HardDrive, Loader2 } from 'lucide-react';

interface PDFHistoryCardProps {
  record: any;
  onDelete: (id: string, storageUrl: string) => void;
  isDeleting?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

const PDFHistoryCard: React.FC<PDFHistoryCardProps> = ({ 
  record, 
  onDelete, 
  isDeleting,
  isSelected,
  onSelect 
}) => {
  const formattedDate = new Date(record.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`bg-white rounded-[2rem] border-2 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative ${
      isSelected ? 'border-primary-500 bg-primary-50/10' : 'border-slate-100'
    }`}>
      {/* Multi-select check */}
      {onSelect && (
        <div className="absolute top-4 left-4 z-10">
          <input 
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(record.id)}
            className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary-600 focus:ring-primary-500 cursor-pointer"
          />
        </div>
      )}

      {/* Type Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
        record.type === 'individual' 
          ? 'bg-blue-50 text-blue-600' 
          : 'bg-amber-50 text-amber-600'
      }`}>
        {record.type}
      </div>

      <div className="flex items-start gap-4 mb-6">
        <div className={`p-4 rounded-2xl ${
          record.type === 'individual' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'
        }`}>
          <FileText size={32} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 truncate">{record.students?.student_name}</h3>
          <p className="text-xs font-bold text-slate-400 truncate uppercase tracking-widest">
            Roll: {record.students?.roll_number}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-8">
        <div className="flex items-center gap-2 text-slate-500">
          <Calendar size={14} className="text-slate-300" />
          <span className="text-xs font-bold">{formattedDate}</span>
        </div>
        {record.exams && (
          <div className="flex items-center gap-2 text-slate-500">
            <FileText size={14} className="text-slate-300" />
            <span className="text-xs font-bold truncate">{record.exams?.exam_name || 'Individual Record'}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-500">
          <HardDrive size={14} className="text-slate-300" />
          <span className="text-xs font-bold">Cloud Archived</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
        <a 
          href={record.storage_url} 
          target="_blank" 
          rel="noreferrer"
          className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 text-slate-600 rounded-xl text-xs font-black hover:bg-primary-50 hover:text-primary-600 transition-all"
        >
          <ExternalLink size={14} />
          View
        </a>
        <button 
          onClick={() => onDelete(record.id, record.storage_url)}
          disabled={isDeleting}
          className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
          title="Delete Permanent Archive"
        >
          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      </div>
    </div>
  );
};

export default PDFHistoryCard;
