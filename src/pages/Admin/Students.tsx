import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  User as UserIcon, 
  Hash, 
  Loader2,
  ArrowLeft,
  GraduationCap,
  ClipboardCheck,
  ChevronRight,
  FileText,
  CheckSquare,
  Square,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface Batch {
  id: string;
  class_name: string;
  batch_code: string;
  batch_year: number;
  colleges?: {
    college_code: string;
  };
}

interface Student {
  id: string;
  student_name: string;
  roll_number: string;
  batch_id: string;
  created_at: string;
  pen_number?: string;
  seat_number?: string;
  reg_number?: string;
  mother_name: string;
  subject_preferences?: Record<string, string>;
}

interface BatchSubject extends Subject {
  subject_group: string | null;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  subject_group?: string | null;
}

const Students: React.FC = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [batch, setBatch] = useState<Batch | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [batchSubjects, setBatchSubjects] = useState<BatchSubject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({ 
    student_name: '', 
    roll_number: '',
    pen_number: '',
    seat_number: '',
    reg_number: '',
    mother_name: '',
    subject_preferences: {} as Record<string, string>
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      toast.success(`${selectedIds.size} students removed`);
      setIsDeleteModalOpen(false);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      fetchBatchAndStudents();
    } catch (error: any) {
      toast.error('Error removing students: Some may have results');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)));
      setIsSelectionMode(true);
    }
  };

  const fetchBatchAndStudents = async () => {
    if (!batchId || !user?.college_id) return;
    try {
      setIsLoading(true);
      
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*, colleges(college_code)')
        .eq('id', batchId)
        .eq('college_id', user.college_id)
        .single();
      
      if (batchError) throw batchError;
      setBatch(batchData);

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('batch_id', batchId)
        .order('roll_number', { ascending: true });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch batch subjects for preferences
      const { data: bsData, error: bsError } = await supabase
        .from('batch_subjects')
        .select('subjects(*)')
        .eq('batch_id', batchId);
      
      if (bsError) throw bsError;
      const formattedBS = (bsData || []).map(item => item.subjects) as unknown as BatchSubject[];
      setBatchSubjects(formattedBS);
    } catch (error: any) {
      toast.error('Failed to load batch students');
      navigate('/admin/batches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchAndStudents();
  }, [batchId, user]);

  const openModal = (student: Student | null = null) => {
    if (student) {
      setCurrentStudent(student);
      setFormData({ 
        student_name: student.student_name, 
        roll_number: student.roll_number,
        pen_number: student.pen_number || '',
        seat_number: student.seat_number || '',
        reg_number: student.reg_number || '',
        mother_name: student.mother_name || '',
        subject_preferences: student.subject_preferences || {}
      });
    } else {
      setCurrentStudent(null);
      setFormData({ 
        student_name: '', 
        roll_number: '',
        pen_number: '',
        seat_number: '',
        reg_number: '',
        mother_name: '',
        subject_preferences: {}
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;

    setIsSubmitting(true);
    try {
      // 1. Uniqueness Checks
      const checkFields = [
        { key: 'roll_number', label: 'Roll Number', value: formData.roll_number, scope: 'batch' },
        { key: 'reg_number', label: 'Reg. Number', value: formData.reg_number, scope: 'global' },
        { key: 'seat_number', label: 'Seat Number', value: formData.seat_number, scope: 'global' },
        { key: 'pen_number', label: 'PEN Number', value: formData.pen_number, scope: 'global' }
      ];

      for (const field of checkFields) {
        if (!field.value) continue;

        let query = supabase.from('students').select('id').eq(field.key, field.value);
        if (field.scope === 'batch') query = query.eq('batch_id', batchId);
        if (currentStudent) query = query.neq('id', currentStudent.id);

        const { data: existing } = await query.maybeSingle();
        if (existing) {
          toast.error(`${field.label} "${field.value}" is already taken`);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Prepare payload (convert empty strings to null for unique optional fields)
      const payload = {
        ...formData,
        reg_number: formData.reg_number || null,
        seat_number: formData.seat_number || null,
        pen_number: formData.pen_number || null,
      };

      if (currentStudent) {
        const { error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', currentStudent.id);
        
        if (error) throw error;
        toast.success('Student profile updated');
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{ ...payload, batch_id: batchId }]);
        
        if (error) throw error;
        toast.success('Student enrolled successfully');
      }
      
      setIsModalOpen(false);
      fetchBatchAndStudents();
    } catch (error: any) {
      toast.error(error.message || 'Error processing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStudent) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', currentStudent.id);
      
      if (error) throw error;
      toast.success('Student record removed');
      setIsDeleteModalOpen(false);
      fetchBatchAndStudents();
    } catch (error: any) {
      toast.error('Cannot remove student: They may have existing result records');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.mother_name && s.mother_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

// Group subjects by their group code
  const groupedSubjects = batchSubjects.reduce((acc, sub) => {
    if (sub.subject_group) {
      if (!acc[sub.subject_group]) acc[sub.subject_group] = [];
      acc[sub.subject_group].push(sub);
    }
    return acc;
  }, {} as Record<string, BatchSubject[]>);

  return (
    <DashboardLayout title="Student Roster">
      {/* Page Header */}
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multi-Selection Active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={selectAll}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
              >
                {selectedIds.size === filteredStudents.length ? 'Deselect All' : 'Select All'}
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"
                title="Delete Selected"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Link to="/admin/batches" className="flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-700 transition-colors uppercase tracking-widest">
                <ArrowLeft size={16} />
                Back to Batches
              </Link>
              <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Academic Year: {batch?.batch_year}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shrink-0 ${
                  batch?.class_name.startsWith('11') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      batch?.class_name.startsWith('11') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {batch?.class_name.split(' (')[0]}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Code: {batch?.batch_code}
                    </span>
                  </div>
                  <h1 className="text-xl font-black text-slate-800 leading-none">Student Roster</h1>
                </div>
              </div>
              <button 
                onClick={() => openModal()}
                className="btn-primary flex items-center justify-center gap-2 px-6 h-12 shadow-lg shadow-primary-600/20"
              >
                <Plus size={18} />
                <span>Add Student</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder="Search students by name, roll number or mother's name..."
          className="input-field pl-12 h-14"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block table-wrapper overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-32">Roll No.</th>
              <th>Student Name</th>
              <th>Mother Name</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse"><td colSpan={5} className="p-10 bg-slate-50/20"></td></tr>
              ))
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr 
                  key={student.id} 
                  onMouseDown={() => onTouchStart(student.id)}
                  onMouseUp={onTouchEnd}
                  onMouseLeave={onTouchEnd}
                  onTouchStart={() => onTouchStart(student.id)}
                  onTouchEnd={onTouchEnd}
                  className={`transition-all group ${
                    selectedIds.has(student.id) 
                      ? 'bg-primary-50 ring-2 ring-inset ring-primary-200' 
                      : 'hover:bg-slate-50/80 cursor-pointer'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (isSelectionMode) {
                      toggleSelection(student.id);
                    } else {
                      navigate(`/admin/batches/${batchId}/students/${student.id}/result`);
                    }
                  }}
                >
                  <td className="w-12">
                    {isSelectionMode ? (
                      <div className="flex justify-center">
                        {selectedIds.has(student.id) ? (
                          <CheckSquare className="text-primary-600" size={18} />
                        ) : (
                          <Square className="text-slate-300" size={18} />
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] font-black text-slate-400 px-2 py-1 rounded bg-slate-100/50">
                        {student.roll_number}
                      </span>
                    )}
                  </td>
                  <td>
                    <p className="font-semibold text-slate-800">{student.student_name}</p>
                    {isSelectionMode && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Roll: {student.roll_number}
                      </p>
                    )}
                  </td>
                  <td>
                    <p className="text-sm text-slate-400">{student.mother_name || 'N/A'}</p>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => openModal(student)}
                        className="btn-icon hover:text-primary-600 hover:bg-primary-50"
                        title="Edit Student"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setCurrentStudent(student); setIsDeleteModalOpen(true); }}
                        className="btn-icon hover:text-red-600 hover:bg-red-50"
                        title="Delete Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  <EmptyState 
                    icon={UserIcon}
                    title="No students found"
                    message="Begin by enrolling students into this academic batch to manage their performance records."
                    action={{ label: "Enroll Student", onClick: () => openModal() }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100"></div>
          ))
        ) : filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <motion.div 
              key={student.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onMouseDown={() => onTouchStart(student.id)}
              onMouseUp={onTouchEnd}
              onMouseLeave={onTouchEnd}
              onTouchStart={() => onTouchStart(student.id)}
              onTouchEnd={onTouchEnd}
              onClick={() => {
                if (isSelectionMode) {
                  toggleSelection(student.id);
                } else {
                  navigate(`/admin/batches/${batchId}/students/${student.id}/result`);
                }
              }}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                selectedIds.has(student.id)
                  ? 'bg-primary-50 border-primary-200 shadow-md ring-1 ring-primary-200 scale-[1.02]'
                  : 'bg-white border-slate-100 shadow-sm active:scale-95'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  selectedIds.has(student.id)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-slate-100 text-slate-500 border-slate-200 border'
                }`}>
                  {selectedIds.has(student.id) ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <span className="font-mono text-xs font-black">{student.roll_number}</span>
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-800 leading-tight">{student.student_name}</p>
                  <p className="text-[10px] uppercase font-bold text-slate-400 mt-1">M: {student.mother_name || 'N/A'}</p>
                </div>
              </div>
              <ChevronRight size={20} className={selectedIds.has(student.id) ? 'text-primary-400' : 'text-slate-300'} />
            </motion.div>
          ))
        ) : (
          <EmptyState 
            icon={UserIcon}
            title="No students"
            message="No active enrollments for this session."
            compact
          />
        )}
      </div>

      {/* CRUD Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-box w-full max-w-xl"
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {currentStudent ? 'Modify Enrollment' : 'New Enrollment'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                <div className="modal-body space-y-6 pt-6">
                  {/* Personal Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono">Personal Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Student Full Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex: Jayesh Ravindra Patil"
                          className="input-field"
                          value={formData.student_name}
                          onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="input-label">Mother's Name</label>
                        <input 
                          type="text"
                          required
                          placeholder="Ex: Sunanda"
                          className="input-field"
                          value={formData.mother_name}
                          onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Identification Section */}
                  <div className="space-y-4 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                       <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>
                       <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono">Roll & Registration</h3>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="input-label">Roll Number</label>
                        <input 
                          type="text"
                          required
                          placeholder="01"
                          className="input-field font-mono"
                          value={formData.roll_number}
                          onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="input-label">Reg. Number</label>
                        <input 
                          type="text"
                          placeholder="Optional"
                          className="input-field"
                          value={formData.reg_number}
                          onChange={(e) => setFormData({ ...formData, reg_number: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 lg:col-span-1">
                        <label className="input-label">Seat Number</label>
                        <input 
                          type="text"
                          placeholder="Ex: H005612"
                          className="input-field"
                          value={formData.seat_number}
                          onChange={(e) => setFormData({ ...formData, seat_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="input-label">PEN Number</label>
                      <input 
                        type="text"
                        placeholder="Permanent Education Number"
                        className="input-field"
                        value={formData.pen_number}
                        onChange={(e) => setFormData({ ...formData, pen_number: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Subject Preferences Section */}
                  {Object.keys(groupedSubjects).length > 0 && (
                    <div className="space-y-4 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                         <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-sm"></span>
                         <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 font-mono">Alternative Subject Preferences</h3>
                      </div>

                      <div className="space-y-6">
                        {(Object.entries(groupedSubjects) as [string, BatchSubject[]][]).map(([groupCode, groupSubs]) => (
                          <div key={groupCode} className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                            <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-3 px-1">
                              Group: {groupCode}
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                              {groupSubs.map(sub => (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    const currentPref = formData.subject_preferences[groupCode];
                                    const newPrefs = { ...formData.subject_preferences };
                                    
                                    if (currentPref === sub.id) {
                                      delete newPrefs[groupCode];
                                    } else {
                                      newPrefs[groupCode] = sub.id;
                                    }
                                    
                                    setFormData({
                                      ...formData,
                                      subject_preferences: newPrefs
                                    });
                                  }}
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                    formData.subject_preferences[groupCode] === sub.id
                                      ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                                      : 'bg-white border-slate-100 text-slate-600 hover:border-amber-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                                      formData.subject_preferences[groupCode] === sub.id
                                        ? 'border-amber-500 bg-white'
                                        : 'border-slate-200'
                                    }`}>
                                      {formData.subject_preferences[groupCode] === sub.id && (
                                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold leading-none mb-1 uppercase">{sub.subject_name}</p>
                                      <p className="text-[9px] font-mono font-bold text-slate-400">{sub.subject_code}</p>
                                    </div>
                                  </div>
                                  {formData.subject_preferences[groupCode] === sub.id && (
                                    <div className="px-2 py-0.5 bg-amber-200 text-amber-700 rounded text-[8px] font-black uppercase tracking-widest">
                                      Chosen
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                    {currentStudent ? 'Save Changes' : 'Enroll Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title={isSelectionMode ? `Remove ${selectedIds.size} Students?` : "Delete Record?"}
        message={isSelectionMode 
          ? `This action will permanently unenroll all ${selectedIds.size} selected students. This cannot be undone.` 
          : `This action will permanently unenroll "${currentStudent?.student_name}". Are you sure you want to proceed?`
        }
        onConfirm={isSelectionMode ? handleBulkDelete : handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Students;
