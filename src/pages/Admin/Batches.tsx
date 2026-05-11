import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  GraduationCap, 
  Hash, 
  Calendar,
  Loader2,
  AlertCircle,
  Users,
  ChevronRight,
  Save,
  CheckSquare,
  Square,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface Batch {
  id: string;
  class_name: string;
  batch_year: number;
  batch_code: string;
  college_id: string;
  created_at: string;
  colleges?: {
    college_code: string;
  };
  _count_students?: number;
}

const Batches: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    class_name: '11th',
    division: 'A',
    batch_year: new Date().getFullYear(),
    batch_code: '' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collegeCode, setCollegeCode] = useState<string>('');
  const [batchCodeTouched, setBatchCodeTouched] = useState(false);

  // Multi-selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) setIsSelectionMode(false);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
    toast.success('Selection mode enabled', { icon: '🔘' });
  };

  const onTouchStart = (id: string) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => {
      handleLongPress(id);
    }, 600);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    // Check if any selected batch has students
    const batchesWithStudents = batches.filter(b => selectedIds.has(b.id) && (b._count_students || 0) > 0);
    if (batchesWithStudents.length > 0) {
      toast.error(`Cannot delete: ${batchesWithStudents.length} batches have active students`);
      setIsDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      toast.success(`${selectedIds.size} batches removed`);
      setIsDeleteModalOpen(false);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      fetchBatches();
    } catch (error: any) {
      toast.error('Deletion failed: Records are linked to these batches');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectAll = () => {
    if (selectedIds.size === filteredBatches.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredBatches.map(b => b.id)));
      setIsSelectionMode(true);
    }
  };

  const fetchCollegeCode = async () => {
    if (!user?.college_id) return;
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('college_code')
        .eq('id', user.college_id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setCollegeCode(data.college_code.toUpperCase());
      }
    } catch (error: any) {
      console.error('Error fetching college code:', error.message);
    }
  };

  const fetchBatches = async () => {
    if (!user?.college_id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('batches')
        .select('*, students(id), colleges(college_code)')
        .eq('college_id', user.college_id)
        .order('batch_year', { ascending: false });
      
      if (error) throw error;
      
      const formatted = (data || []).map(b => ({
        ...b,
        _count_students: (b.students as any[]).length
      }));
      
      setBatches(formatted);
    } catch (error: any) {
      toast.error('Failed to load batches');
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchCollegeCode();
  }, [user]);

  // Auto-generate batch code
  useEffect(() => {
    if (!currentBatch && isModalOpen) {
      const cls = formData.class_name.replace('th', '').replace('st', '').replace('nd', '').replace('rd', '');
      const code = `${cls}${formData.batch_year}${formData.division}`;
      setFormData(prev => ({ ...prev, batch_code: code }));
    }
  }, [formData.class_name, formData.batch_year, formData.division, currentBatch, isModalOpen]);

  const openModal = (batch: Batch | null = null) => {
    setBatchCodeTouched(false);
    if (batch) {
      setCurrentBatch(batch);
      const divMatch = batch.class_name.match(/\(([^)]+)\)/);
      const pureClass = batch.class_name.split(' (')[0];
      
      let suffix = batch.batch_code;
      if (collegeCode && batch.batch_code.startsWith(`${collegeCode}-`)) {
        suffix = batch.batch_code.replace(`${collegeCode}-`, '');
      }

      setFormData({
        class_name: pureClass,
        division: divMatch ? divMatch[1] : 'A',
        batch_year: batch.batch_year,
        batch_code: suffix
      });
    } else {
      setCurrentBatch(null);
      const year = new Date().getFullYear();
      setFormData({
        class_name: '11th',
        division: 'A',
        batch_year: year,
        batch_code: `11${year}A`
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.college_id) return;

    if (!collegeCode) {
      toast.error('Please set your College Code in profile settings first');
      return;
    }

    const suffix = formData.batch_code.trim();
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    
    if (!suffix) {
      toast.error('Batch code suffix cannot be empty');
      return;
    }

    if (!alphanumericRegex.test(suffix)) {
      toast.error('Batch code suffix must be alphanumeric only (no spaces or special chars)');
      return;
    }

    if (suffix.length < 4 || suffix.length > 20) {
      toast.error('Batch code suffix must be between 4 and 20 characters');
      return;
    }

    const fullBatchCode = `${collegeCode}-${suffix}`;
    const finalClassName = `${formData.class_name} (${formData.division})`;

    setIsSubmitting(true);
    try {
      if (currentBatch) {
        const { data: existing } = await supabase
          .from('batches')
          .select('id')
          .eq('college_id', user.college_id)
          .eq('batch_code', fullBatchCode)
          .neq('id', currentBatch.id)
          .maybeSingle();

        if (existing) {
          toast.error(`Batch code ${fullBatchCode} is already used in your college`);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('batches')
          .update({
            class_name: finalClassName,
            batch_year: formData.batch_year,
            batch_code: fullBatchCode
          })
          .eq('id', currentBatch.id);
        
        if (error) throw error;
        toast.success('Batch updated successfully');
      } else {
        const { data: existingClass } = await supabase
          .from('batches')
          .select('id')
          .eq('college_id', user.college_id)
          .eq('class_name', finalClassName)
          .eq('batch_year', formData.batch_year)
          .maybeSingle();

        if (existingClass) {
          toast.error(`Division ${formData.division} already exists for Class ${formData.class_name} in ${formData.batch_year}`);
          setIsSubmitting(false);
          return;
        }

        const { data: existingCode } = await supabase
          .from('batches')
          .select('id')
          .eq('college_id', user.college_id)
          .eq('batch_code', fullBatchCode)
          .maybeSingle();

        if (existingCode) {
          toast.error(`Batch code ${fullBatchCode} is already established in your college`);
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from('batches')
          .insert([{
            class_name: finalClassName,
            batch_year: formData.batch_year,
            batch_code: fullBatchCode,
            college_id: user.college_id
          }]);
        
        if (error) throw error;
        toast.success('Cohort created');
      }
      
      setIsModalOpen(false);
      fetchBatches();
    } catch (error: any) {
      toast.error(error.message || 'Error saving batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentBatch) return;
    
    if (currentBatch._count_students && currentBatch._count_students > 0) {
      toast.error(`Cannot delete: Batch has ${currentBatch._count_students} active students`);
      setIsDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', currentBatch.id);
      
      if (error) throw error;
      toast.success('Batch removed');
      setIsDeleteModalOpen(false);
      fetchBatches();
    } catch (error: any) {
      toast.error('Deletion failed: Records are linked to this batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = batches.filter(b => 
    b.batch_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Academic Cohorts & Batches">
      <div className="mb-6 flex flex-col gap-4">
        {isSelectionMode ? (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between p-4 bg-slate-900 rounded-3xl shadow-xl border border-slate-800"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
                className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-colors"
              >
                <X size={20} />
              </button>
              <div>
                <h2 className="text-white font-black">{selectedIds.size} Selected</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Batches Multi-Selection</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={selectAll}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
              >
                {selectedIds.size === filteredBatches.length ? 'Deselect All' : 'Select All'}
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-50 hover:text-white rounded-2xl transition-all"
                title="Delete Selected"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-3xl border-2 border-slate-100 shadow-sm">
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Batches</h1>
              <p className="text-slate-500 font-medium mt-1">Administrative oversight of academic cohorts and divisions</p>
            </div>
            <button 
              onClick={() => openModal()}
              className="btn-primary w-full sm:w-auto h-14 flex items-center justify-center gap-2 px-8 shadow-xl shadow-primary-600/20"
            >
              <Plus size={20} />
              <span className="text-lg">Add New Batch</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Filter by identifier or class..."
            className="input-field pl-12 h-12 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
           <Hash size={14} className="text-slate-400" />
           Cohort Load: {filteredBatches.length} Active
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-64">Academic Level</th>
              <th className="w-48">Batch Code</th>
              <th className="text-center w-32">Academic Year</th>
              <th className="w-40 text-center">Enrollment</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="p-10 bg-slate-50/20"></td>
                </tr>
              ))
            ) : filteredBatches.length > 0 ? (
              filteredBatches.map((batch) => (
                <tr 
                  key={batch.id} 
                  onMouseDown={() => onTouchStart(batch.id)}
                  onMouseUp={onTouchEnd}
                  onMouseLeave={onTouchEnd}
                  onTouchStart={() => onTouchStart(batch.id)}
                  onTouchEnd={onTouchEnd}
                  className={`group transition-all ${
                    selectedIds.has(batch.id) 
                      ? 'bg-primary-50 ring-2 ring-inset ring-primary-200' 
                      : 'hover:bg-slate-50 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (isSelectionMode) {
                      toggleSelection(batch.id);
                    } else {
                      navigate(`/admin/batches/${batch.id}/students`);
                    }
                  }}
                >
                  <td className="w-12">
                    {isSelectionMode ? (
                      <div className="flex justify-center">
                        {selectedIds.has(batch.id) ? (
                          <CheckSquare className="text-primary-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                        batch.class_name.startsWith('11') ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                      }`}>
                        {batch.class_name.split(' ')[0].replace('th','')}
                      </div>
                    )}
                  </td>
                  <td>
                    <div>
                      <p className="font-extrabold text-slate-800 tracking-tight">{batch.class_name}</p>
                      {isSelectionMode && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Code: {batch.batch_code}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="font-mono text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border border-primary-100 inline-block uppercase"
                      title={batch.batch_code}
                    >
                      {batch.batch_code}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="text-sm font-bold text-slate-600 font-mono tracking-tighter">{batch.batch_year}</span>
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        {batch._count_students}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600">Students</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end items-center gap-1">
                      <button 
                        onClick={() => openModal(batch)}
                        className="btn-icon hover:text-primary-600 hover:bg-primary-50"
                        title="Edit Batch"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setCurrentBatch(batch); setIsDeleteModalOpen(true); }}
                        className="btn-icon hover:text-red-600 hover:bg-red-50"
                        title="Delete Batch"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-primary-600 group-hover:text-white transition-all ml-1">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>
                  <EmptyState 
                    icon={GraduationCap}
                    title={searchTerm ? "No cohorts matched" : "Academic register empty"}
                    message={searchTerm ? `The record search for "${searchTerm}" returned zero matches in campus cohorts.` : "Establish your first academic cohort or batch to begin mapping students."}
                    action={searchTerm ? undefined : { label: "Define Batch", onClick: () => openModal() }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="modal-box w-full max-w-xl"
            >
              <div className="modal-header">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-100 rounded-2xl text-primary-600">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">{currentBatch ? 'Modify Batch' : 'Create New Batch'}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Academic Cohort Configuration</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="input-label">Academic Level</label>
                      <select 
                        className="input-field h-12 text-sm font-bold bg-slate-50 border-slate-100"
                        value={formData.class_name}
                        onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      >
                        <option value="11th">Class 11th (Junior)</option>
                        <option value="12th">Class 12th (Senior)</option>
                      </select>
                    </div>

                    <div>
                      <label className="input-label">Session Year</label>
                      <input 
                        type="number"
                        required
                        className="input-field h-12 text-sm font-bold bg-slate-50 border-slate-100"
                        value={formData.batch_year}
                        onChange={(e) => setFormData({ ...formData, batch_year: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Division / Group Selector</label>
                    <div className="grid grid-cols-4 gap-3">
                      {['A', 'B', 'C', 'D'].map((div) => (
                        <button
                          key={div}
                          type="button"
                          onClick={() => setFormData({ ...formData, division: div })}
                          className={`h-12 rounded-xl text-sm font-black transition-all ${
                            formData.division === div 
                              ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' 
                              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {div}
                        </button>
                      ))}
                    </div>
                    <div className="relative mt-4">
                      <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder="Custom Group (e.g. CS, BIO)"
                        value={!['A', 'B', 'C', 'D'].includes(formData.division) ? formData.division : ''}
                        onChange={(e) => setFormData({ ...formData, division: e.target.value.toUpperCase() })}
                        className="input-field pl-12 h-12 bg-slate-50 border-slate-100"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2rem] p-6 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <label className="block text-[10px] font-black text-primary-400 uppercase tracking-widest mb-4">Final Batch Identifier</label>
                    <div className="flex items-center gap-3">
                      <div className="px-4 py-3 bg-white/10 rounded-xl border border-white/10 text-sm font-black text-white backdrop-blur-sm select-none">
                        {collegeCode || '...'}
                      </div>
                      <div className="flex-1 opacity-20 text-white text-2xl font-black">-</div>
                      <input 
                        type="text"
                        required
                        onBlur={() => setBatchCodeTouched(true)}
                        className={`flex-[3] h-12 bg-white/10 border border-white/20 rounded-xl px-4 text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-white/20 ${batchCodeTouched && !/^[a-zA-Z0-9]{4,20}$/.test(formData.batch_code) ? 'border-red-400 bg-red-400/10' : ''}`}
                        value={formData.batch_code}
                        onChange={(e) => setFormData({ ...formData, batch_code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                        placeholder="IDENTIFIER"
                      />
                    </div>
                    <p className="mt-4 text-[11px] font-medium text-slate-400 flex items-center gap-2">
                       <AlertCircle size={14} className="text-primary-400" />
                       Generated: <span className="font-bold text-white font-mono">{collegeCode || '...'}-{formData.batch_code || '---'}</span>
                    </p>
                  </div>
                </div>

                <div className="modal-footer">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary flex-1 h-12"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex-1 h-12 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (currentBatch ? <Save size={18} /> : <Plus size={18} />)}
                    <span>{currentBatch ? 'Update Record' : 'Commit Batch'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title={isSelectionMode ? `Remove ${selectedIds.size} Batches?` : "Delete Batch?"}
        message={isSelectionMode 
          ? `Are you sure you want to delete all ${selectedIds.size} selected batches? This action cannot be undone if they are empty.` 
          : `Are you sure you want to delete "${currentBatch?.class_name}"? All associated data will be affected.`
        }
        onConfirm={isSelectionMode ? handleBulkDelete : handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Batches;
