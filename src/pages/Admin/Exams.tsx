import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Trash2, 
  X, 
  ClipboardList, 
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface Batch {
  id: string;
  batch_code: string;
  class_name: string;
  colleges?: {
    college_code: string;
  };
}

interface Exam {
  id: string;
  exam_name: string;
  out_of_marks: number;
  passing_marks: number;
  batch_id: string;
  created_at: string;
}

const EXAM_OPTIONS = ['Test-1', 'Mid Term', 'Test-2', 'Annual Exam'];
const QUICK_MARKS = [25, 50, 100];

const Exams: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({ 
    exam_name: 'Test-1', 
    custom_exam_name: '',
    out_of_marks: 100,
    passing_marks: 35,
    batch_id: ''
  });
  const [isCustomExam, setIsCustomExam] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = async () => {
    if (!user?.college_id) return;
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, batch_code, class_name, colleges(college_code)')
        .eq('college_id', user.college_id)
        .order('batch_code', { ascending: true });
      
      if (error) throw error;
      setBatches(data || []);
      if (data?.length && !selectedBatchId) {
        setSelectedBatchId(data[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to load batches');
    }
  };

  const fetchExams = async () => {
    if (!selectedBatchId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('batch_id', selectedBatchId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      toast.error('Failed to load exams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [user]);

  useEffect(() => {
    fetchExams();
  }, [selectedBatchId]);

  const openModal = () => {
    setFormData({
      exam_name: 'Test-1',
      custom_exam_name: '',
      out_of_marks: 100,
      batch_id: selectedBatchId
    });
    setIsCustomExam(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batch_id) {
      toast.error('Select a batch first');
      return;
    }

    setIsSubmitting(true);
    try {
      const examNameText = isCustomExam ? formData.custom_exam_name : formData.exam_name;
      
      const { error } = await supabase
        .from('exams')
        .insert([{
          exam_name: examNameText,
          out_of_marks: formData.out_of_marks,
          batch_id: formData.batch_id
        }]);
      
      if (error) throw error;
      toast.success('Exam scheduled successfully');
      setIsModalOpen(false);
      fetchExams();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentExam) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', currentExam.id);
      
      if (error) throw error;
      toast.success('Exam removed');
      setIsDeleteModalOpen(false);
      fetchExams();
    } catch (error: any) {
      toast.error('Cannot delete: Record likely contains submitted marks');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Examination Cycles">
      <div className="page-header">
        <div>
          <h1 className="page-title">Evaluations</h1>
          <p className="page-subtitle">Schedule and moderate multi-batch academic examinations</p>
        </div>
        <button 
          onClick={openModal}
          disabled={!selectedBatchId}
          className="btn-primary w-full sm:w-auto h-12 shadow-lg shadow-primary-600/20"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus size={20} />
            <span>Initialize Cycle</span>
          </div>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          <select 
            className="input-field pl-12 h-14 text-sm font-extrabold bg-white border-slate-100 shadow-sm appearance-none"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                COHORT: {b.batch_code} ({b.class_name})
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
        </div>
        <div className="flex items-center gap-3 px-6 h-14 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">
           Evaluations: {exams.length}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-100/50 rounded-[2.5rem] animate-pulse border border-dashed border-slate-200"></div>
          ))}
        </div>
      ) : exams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam, idx) => {
            const isTest1 = exam.exam_name.includes('Test-1');
            const isTest2 = exam.exam_name.includes('Test-2');
            const isAnnual = exam.exam_name.includes('Annual');
            const isMid = exam.exam_name.includes('Mid') || exam.exam_name.includes('Intermediate');
            
            let colorTheme = 'slate';
            if (isTest1) colorTheme = 'blue';
            else if (isTest2) colorTheme = 'amber';
            else if (isAnnual) colorTheme = 'emerald';
            else if (isMid) colorTheme = 'purple';

            return (
              <motion.div 
                key={exam.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative group hover:shadow-2xl hover:shadow-primary-900/5 transition-all"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
                    colorTheme === 'blue' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    colorTheme === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    colorTheme === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    colorTheme === 'purple' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    <ClipboardList size={28} />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-100 ${
                      colorTheme === 'blue' ? 'text-blue-600' :
                      colorTheme === 'amber' ? 'text-amber-600' :
                      colorTheme === 'emerald' ? 'text-emerald-600' :
                      colorTheme === 'purple' ? 'text-purple-600' :
                      'text-slate-400'
                    }`}>
                      {exam.out_of_marks} Points
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-1.5">{exam.exam_name}</h3>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    <Calendar size={12} className="text-primary-400" />
                    <span>Established {new Date(exam.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Passing Minimum</span>
                    <span className="text-sm font-extrabold text-emerald-600 mt-1 tracking-tighter">{Math.ceil(exam.out_of_marks * 0.35)} Marks (35%)</span>
                  </div>
                  <button 
                    onClick={() => { setCurrentExam(exam); setIsDeleteModalOpen(true); }}
                    className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Purge Cycle"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState 
           icon={ClipboardList}
           title="No Examination Load"
           message="Start by initializing an evaluation cycle for the selected academic cohort to track curricular progress."
           action={{ label: "Initialize Cycle", onClick: openModal }}
        />
      )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-box w-full max-w-lg"
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                    <ClipboardList size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Initialize Cycle</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                <div className="modal-body space-y-6 pt-6">
                  {/* Exam Name Picker */}
                  <div>
                    <label className="input-label mb-3">Examination Designation</label>
                    {!isCustomExam ? (
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {EXAM_OPTIONS.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setFormData({ ...formData, exam_name: opt })}
                            className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all text-center ${
                              formData.exam_name === opt 
                                ? 'bg-primary-50 border-primary-500 text-primary-700 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomExam(true)}
                          className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest border border-dashed border-slate-300 text-slate-400 hover:border-primary-500 hover:text-primary-600 transition-all font-mono"
                        >
                          Custom Name
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input 
                          type="text"
                          required
                          placeholder="e.g. Unit Test 3, Preparatory Exam"
                          className="input-field"
                          value={formData.custom_exam_name}
                          autoFocus
                          onChange={(e) => setFormData({ ...formData, custom_exam_name: e.target.value })}
                        />
                        <button 
                          type="button"
                          onClick={() => setIsCustomExam(false)}
                          className="text-[10px] font-black text-primary-600 uppercase tracking-widest self-end"
                        >
                          Use Standard Templates
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Marks Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="input-label">Total Weightage</label>
                      <div className="flex gap-1.5 mb-3">
                        {QUICK_MARKS.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setFormData({ ...formData, out_of_marks: m })}
                            className={`flex-1 py-2 rounded-lg text-xs font-black border transition-all ${
                              formData.out_of_marks === m 
                                ? 'bg-emerald-600 text-white border-emerald-600' 
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <input 
                          type="number"
                          required
                          min={1}
                          className="input-field font-black text-lg text-primary-600 bg-primary-50/30 text-center"
                          value={formData.out_of_marks}
                          onChange={(e) => setFormData({ ...formData, out_of_marks: parseInt(e.target.value) || 0 })}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Points</span>
                      </div>
                    </div>

                    <div>
                      <label className="input-label">Passing Minimum (35%)</label>
                      <div className="w-full h-[84px] bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100">
                        <span className="text-2xl font-black text-emerald-600">{Math.ceil(formData.out_of_marks * 0.35)}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gained Marks</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    <span>Confirm Cycle</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Discard Exam Cycle?"
        message={`Delete "${currentExam?.exam_name}"? This terminal action will purge all associated student marks and results permanently.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Exams;
