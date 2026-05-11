import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, CloudUpload, Printer, FileText, Trophy, Loader2 } from 'lucide-react';
import ExamResultPDF from './ExamResultPDF';
import CombinedResultPDF from './CombinedResultPDF';
import { mapToSubjectRows } from '../../utils/studentDataMapper';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: any;
  college: any;
  batch: any;
  exam?: any;
  examResults?: any[];
  allExams?: any[];
  allMarksData?: any;
  allSubjects?: any[];
  pdfSettings?: any;
  onDownload: (type: 'exam' | 'annual') => Promise<void>;
  onUpload: (type: 'exam' | 'annual') => Promise<void>;
}

const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  student,
  college,
  batch,
  exam,
  examResults,
  allExams,
  allMarksData,
  allSubjects,
  pdfSettings,
  onDownload,
  onUpload
}) => {
  const [activeTab, setActiveTab] = useState<'exam' | 'annual'>('exam');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await action();
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-sm print:hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-6xl h-full flex flex-col rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="text-primary-600" />
                Report Card Preview
              </h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{student.student_name} • {student.roll_number}</p>
            </div>

            <div className="flex bg-slate-200 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('exam')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  activeTab === 'exam' 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText size={16} />
                Exam Result
              </button>
              <button
                onClick={() => setActiveTab('annual')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${
                  activeTab === 'annual' 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Trophy size={16} />
                AGGREGATE REPORT
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all md:self-center"
            >
              <X size={24} />
            </button>
          </div>

          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-slate-800 p-8 flex justify-center custom-scrollbar">
            <div className="bg-white shadow-2xl origin-top" style={{ transform: 'scale(0.8)', marginBottom: '-224px' }}>
              {activeTab === 'exam' && exam && examResults && college && (
                <div className="pointer-events-none origin-top">
                  <ExamResultPDF
                    student={student}
                    exam={exam}
                    results={examResults}
                    college={college}
                    pdfSettings={pdfSettings}
                  />
                </div>
              )}
              {activeTab === 'annual' && allExams && allMarksData && allSubjects && college && (
                <div className="pointer-events-none origin-top">
                  <CombinedResultPDF
                    student={student}
                    college={college}
                    batch={batch}
                    allExams={allExams}
                    pdfSettings={pdfSettings}
                    subjectRows={mapToSubjectRows(allSubjects, allExams, allMarksData)} 
                  />
                </div>
              )}
              {activeTab === 'annual' && (!allExams || !allMarksData) && (
                <div className="w-[794px] h-[1123px] flex items-center justify-center text-slate-400">
                  <p className="font-bold">Annual data loading or unavailable...</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 bg-slate-50">
            <button
              onClick={() => handleAction(() => onDownload(activeTab))}
              disabled={isProcessing}
              className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Download size={20} />}
              Download PDF
            </button>
            <button
              onClick={() => handleAction(() => onUpload(activeTab))}
              disabled={isProcessing}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <CloudUpload size={20} />}
              Upload to Cloud
            </button>
            <button
              onClick={handlePrint}
              disabled={isProcessing}
              className="flex items-center gap-2 px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-black hover:bg-slate-300 transition-all disabled:opacity-50"
            >
              <Printer size={20} />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PDFPreviewModal;
