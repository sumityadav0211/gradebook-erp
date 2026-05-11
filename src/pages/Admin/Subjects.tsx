import React, { useEffect, useState, useRef } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  BookOpen, 
  Link2, 
  Layers, 
  CheckCircle,
  Hash, 
  Loader2,
  AlertCircle,
  SquareCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface Batch {
  id: string;
  class_name: string;
  batch_code: string;
  colleges?: {
    college_code: string;
  };
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  subject_group?: string | null;
  college_id: string;
  is_graded: boolean;
  created_at: string;
  _count_batches?: number;
}

const Subjects: React.FC = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batchSubjects, setBatchSubjects] = useState<string[]>([]); // Subject IDs assigned to selected batch
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Subject | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({ subject_name: '', subject_code: '', subject_group: '', is_graded: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!user?.college_id) return;
    try {
      setIsLoading(true);
      
      const [subjectsRes, batchesRes] = await Promise.all([
        supabase
          .from('subjects')
          .select('*, batch_subjects(id)')
          .eq('college_id', user.college_id)
          .order('subject_name', { ascending: true }),
        supabase
          .from('batches')
          .select('id, class_name, batch_code, colleges(college_code)')
          .eq('college_id', user.college_id)
          .order('batch_code', { ascending: true })
      ]);

      if (subjectsRes.error) throw subjectsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      const formattedSubjects = (subjectsRes.data || []).map(s => ({
        ...s,
        _count_batches: (s.batch_subjects as any[]).length
      }));

      setSubjects(formattedSubjects);
      setBatches(batchesRes.data || []);
      
      if (batchesRes.data?.length && !selectedBatchId) {
        setSelectedBatchId(batchesRes.data[0].id);
      }

      // Clear selection if data changes
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (error: any) {
      toast.error('Failed to load subjects and batches');
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatchSubjects = async () => {
    if (!selectedBatchId) return;
    try {
      const { data, error } = await supabase
        .from('batch_subjects')
        .select('subject_id')
        .eq('batch_id', selectedBatchId);
      
      if (error) throw error;
      setBatchSubjects(data?.map(bs => bs.subject_id) || []);
    } catch (error: any) {
      console.error('Error fetching batch subjects:', error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    fetchBatchSubjects();
  }, [selectedBatchId]);

  // Selection Helpers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        const next = prev.filter(i => i !== id);
        if (next.length === 0) setIsSelectionMode(false);
        return next;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleLongPress = (id: string) => {
    setIsSelectionMode(true);
    setSelectedIds([id]);
    if (window.navigator.vibrate) window.navigator.vibrate(50);
  };

  const onTouchStart = (id: string) => {
    if (isSelectionMode) return;
    longPressTimer.current = setTimeout(() => handleLongPress(id), 600);
  };

  const onTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === filteredSubjects.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(filteredSubjects.map(s => s.id));
    }
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const openModal = (subject: Subject | null = null) => {
    if (subject) {
      setCurrentSubject(subject);
      setFormData({ 
        subject_name: subject.subject_name, 
        subject_code: subject.subject_code,
        subject_group: subject.subject_group || '',
        is_graded: subject.is_graded 
      });
    } else {
      setCurrentSubject(null);
      setFormData({ subject_name: '', subject_code: '', subject_group: '', is_graded: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.college_id) return;

    setIsSubmitting(true);
    const upperCode = formData.subject_code.toUpperCase();

    try {
      if (currentSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ 
            subject_name: formData.subject_name, 
            subject_code: upperCode,
            subject_group: formData.subject_group.toUpperCase() || null,
            is_graded: formData.is_graded
          })
          .eq('id', currentSubject.id);
        
        if (error) throw error;
        toast.success('Subject details updated');
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([{ 
            ...formData, 
            subject_code: upperCode,
            subject_group: formData.subject_group.toUpperCase() || null,
            college_id: user.college_id 
          }]);
        
        if (error) throw error;
        toast.success('New subject added to curriculum');
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const idsToDelete = isSelectionMode ? selectedIds : [currentSubject?.id].filter(Boolean) as string[];
    if (idsToDelete.length === 0) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .in('id', idsToDelete);
      
      if (error) throw error;
      toast.success(`${idsToDelete.length > 1 ? 'Subjects' : 'Subject'} deleted successfully`);
      setIsDeleteModalOpen(false);
      setIsSelectionMode(false);
      setSelectedIds([]);
      fetchData();
    } catch (error: any) {
      toast.error('Deletion restricted: One or more subjects are currently assigned to batches');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubjectAssignment = async (subjectId: string, isAssigned: boolean) => {
    if (!selectedBatchId) return;
    
    try {
      if (isAssigned) {
        // Remove assignment
        const { error } = await supabase
          .from('batch_subjects')
          .delete()
          .eq('batch_id', selectedBatchId)
          .eq('subject_id', subjectId);
        
        if (error) throw error;
        toast.success('Subject removed from batch');
      } else {
        // Add assignment
        const { error } = await supabase
          .from('batch_subjects')
          .insert([{ batch_id: selectedBatchId, subject_id: subjectId }]);
        
        if (error) throw error;
        toast.success('Subject linked to batch');
      }
      fetchBatchSubjects();
      fetchData(); // Update batch counts in table
    } catch (error: any) {
      toast.error('Failed to update assignment');
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.subject_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const assignedSubjects = subjects.filter(s => batchSubjects.includes(s.id));
  const unassignedSubjects = subjects.filter(s => !batchSubjects.includes(s.id));

  return (
    <DashboardLayout title="Subjects Management">
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum</h1>
          <p className="page-subtitle">Standardize and manage academic subject database</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary flex items-center justify-center gap-2 px-8 h-14 shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span className="uppercase text-[10px] font-black tracking-[0.2em]">Add Subject</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Subject Registry List */}
        <div className="xl:col-span-4 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Filter master registry..."
                className="input-field pl-12 h-14 bg-white border-slate-100 shadow-sm text-sm font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {isSelectionMode && (
              <button 
                onClick={selectAll}
                className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all shadow-sm"
                title={selectedIds.length === filteredSubjects.length ? 'Deselect All' : 'Select All'}
              >
                <SquareCheck size={20} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {isSelectionMode && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-3xl mb-4 text-white shadow-xl">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={exitSelectionMode}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest">{selectedIds.length} Selected</span>
                  </div>
                  <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-white transition-all shadow-lg shadow-red-500/20"
                  >
                    <Trash2 size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Delete All</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-white border border-slate-100 rounded-3xl animate-pulse" />
              ))
            ) : filteredSubjects.length > 0 ? (
              filteredSubjects.map((subject) => (
                <motion.div 
                  key={subject.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onMouseDown={() => onTouchStart(subject.id)}
                  onMouseUp={onTouchEnd}
                  onMouseLeave={onTouchEnd}
                  onTouchStart={() => onTouchStart(subject.id)}
                  onTouchEnd={onTouchEnd}
                  onClick={() => isSelectionMode ? toggleSelection(subject.id) : null}
                  className={`group relative p-5 bg-white border transition-all cursor-pointer ${
                    selectedIds.includes(subject.id) 
                      ? 'border-primary-500 bg-primary-50/10 shadow-lg ring-1 ring-primary-500' 
                      : 'border-slate-100 hover:border-primary-200 hover:shadow-md'
                  } rounded-3xl`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black border shrink-0 shadow-sm transition-all ${
                      selectedIds.includes(subject.id)
                        ? 'bg-primary-500 text-white border-primary-600 scale-90'
                        : 'bg-primary-50 text-primary-600 border-primary-100'
                    }`}>
                      {selectedIds.includes(subject.id) ? <Check size={24} strokeWidth={4} /> : subject.subject_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pr-12">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-slate-800 uppercase tracking-tight truncate">{subject.subject_name}</p>
                        {subject.is_graded && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            Grade Based
                          </span>
                        )}
                        {subject.subject_group && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
                            GROUP: {subject.subject_group}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 uppercase">
                          {subject.subject_code}
                        </span>
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                          {subject._count_batches || 0} Batches
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isSelectionMode && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openModal(subject); }}
                        className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Edit Profile"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentSubject(subject); setIsDeleteModalOpen(true); }}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <EmptyState 
                icon={BookOpen}
                title="Registry Empty"
                message="No academic subjects mapped to your criteria."
              />
            )}
          </div>
        </div>

        {/* Batch Mapping Section */}
        <div className="xl:col-span-8 bg-slate-50/50 rounded-[3rem] p-8 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-primary-500 shadow-sm">
                <Link2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Curriculum Assignment</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Map registry subjects to academic batches</p>
              </div>
            </div>

            <div className="min-w-[240px]">
              <div className="relative">
                <select 
                  className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-5 pr-12 appearance-none text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                >
                  <option value="" disabled>Select internal batch code...</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code} ({b.class_name})
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Plus size={18} className="rotate-45" />
                </div>
              </div>
            </div>
          </div>

          {!selectedBatchId ? (
            <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
              <Layers className="mx-auto text-slate-200 mb-6" size={64} />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Context Required</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium mt-2">Identify an academic batch from the selector above to manage its subject matrix.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Assigned Column */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                  Assigned Curriculum
                </h3>
                <div className="space-y-3 min-h-[400px]">
                  {assignedSubjects.length > 0 ? (
                    assignedSubjects.map(sub => (
                      <motion.div 
                        key={sub.id}
                        layout
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="group flex items-center gap-4 p-4 bg-primary-50 border border-primary-100 rounded-2xl hover:border-primary-200 transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-white text-primary-600 flex items-center justify-center font-black text-xs border border-primary-100 shadow-sm shrink-0">
                          {sub.subject_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-800 tracking-tight text-xs uppercase truncate">{sub.subject_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{sub.subject_code}</p>
                        </div>
                        <button 
                          onClick={() => toggleSubjectAssignment(sub.id, true)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-300">
                      <BookOpen size={48} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No subjects assigned yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Available Column */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                  Available to Assign
                </h3>
                <div className="space-y-3 min-h-[400px]">
                  {unassignedSubjects.length > 0 ? (
                    unassignedSubjects.map(sub => (
                      <motion.div 
                        key={sub.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => toggleSubjectAssignment(sub.id, false)}
                        className="group flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:text-primary-600 group-hover:bg-white flex items-center justify-center font-black text-xs border border-slate-100 transition-colors shrink-0 shadow-sm">
                          {sub.subject_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-800 tracking-tight text-xs uppercase truncate">{sub.subject_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">{sub.subject_code}</p>
                        </div>
                        <div className="flex items-center gap-2 text-primary-500 group-hover:translate-x-1 transition-transform">
                          <span className="text-[9px] font-black uppercase tracking-widest">Assign</span>
                          <Plus size={14} />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-emerald-400">
                      <CheckCircle size={48} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">All subjects assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {currentSubject ? 'Subject Modification' : 'Registry Enrollment'}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Define core curricular identifiers</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Subject Nomenclature</label>
                    <div className="relative group">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Theoretical Astrophysics"
                        className="input-field pl-12 h-14 font-bold"
                        value={formData.subject_name}
                        onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registry Code</label>
                      <span className="text-[8px] font-black text-primary-500 uppercase tracking-[0.2em] bg-primary-50 px-2 py-0.5 rounded">Alphanumeric Only</span>
                    </div>
                    <div className="relative group">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. PHY-401"
                        className="input-field pl-12 h-14 font-mono font-bold tracking-widest uppercase"
                        value={formData.subject_code}
                        onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Group Code (Optional)</label>
                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded">Use same code for alternatives</span>
                    </div>
                    <div className="relative group">
                      <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary-500 transition-colors" size={20} />
                      <input 
                        type="text"
                        placeholder="e.g. LANG, OPT-1"
                        className="input-field pl-12 h-14 font-mono font-bold tracking-widest uppercase"
                        value={formData.subject_group}
                        onChange={(e) => setFormData({ ...formData, subject_group: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${formData.is_graded ? 'bg-primary-500 text-white' : 'bg-white text-slate-300'}`}>
                        <AlertCircle size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800 tracking-tight">Grade-Centric System</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Disable numerical marks</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({ ...formData, is_graded: !formData.is_graded })}
                      className={`w-14 h-8 rounded-full relative transition-all shadow-inner ${formData.is_graded ? 'bg-primary-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all ${formData.is_graded ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-14 flex-1 bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    Discard Changes
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="h-14 flex-[2] bg-primary-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                    {currentSubject ? 'Finalize Modification' : 'Enroll Subject'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title={isSelectionMode ? `Purge ${selectedIds.length} Subjects?` : "Revoke Curricular Access?"}
        message={isSelectionMode 
          ? `This action will permanently delete ${selectedIds.length} subjects from the registry. Security safeguards will block this if dependencies exist.`
          : `This action will purge "${currentSubject?.subject_name}" from the global registry. Security safeguards will block this if dependencies exist.`
        }
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Subjects;
