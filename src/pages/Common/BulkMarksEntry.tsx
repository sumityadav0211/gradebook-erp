import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  Search, 
  ChevronDown, 
  Loader2,
  Save,
  Users,
  AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';

const BulkMarksEntry: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [examData, setExamData] = useState<any>(null);

  const fetchInitialData = useCallback(async () => {
    if (!user?.college_id) return;
    try {
      const { data } = await supabase
        .from('batches')
        .select('*')
        .eq('college_id', user.college_id)
        .order('batch_code');
      setBatches(data || []);
    } catch (err) {
      toast.error('Failed to load batches');
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // When batch changes, load exams and subjects
  useEffect(() => {
    if (selectedBatch) {
      fetchExamsAndSubjects();
      setSelectedExam('');
      setSelectedSubject('');
      setStudents([]);
      setMarks({});
    } else {
      setExams([]);
      setSubjects([]);
      setSelectedExam('');
      setSelectedSubject('');
      setStudents([]);
      setMarks({});
    }
  }, [selectedBatch]);

  const fetchExamsAndSubjects = async () => {
    try {
      const [examsRes, subjectsRes] = await Promise.all([
        supabase.from('exams').select('*').eq('batch_id', selectedBatch).order('created_at', { ascending: false }),
        supabase.from('batch_subjects').select('subject_id, subjects(subject_name, is_graded)').eq('batch_id', selectedBatch)
      ]);
      
      setExams(examsRes.data || []);
      
      const formattedSubjects = (subjectsRes.data || []).map((s: any) => ({
        id: s.subject_id,
        name: Array.isArray(s.subjects) ? s.subjects[0]?.subject_name : s.subjects?.subject_name,
        is_graded: Array.isArray(s.subjects) ? s.subjects[0]?.is_graded : s.subjects?.is_graded
      }));
      setSubjects(formattedSubjects);
    } catch (err) {
      toast.error('Failed to load exams or subjects');
    }
  };

  const loadStudentsAndMarks = async () => {
    if (!selectedBatch || !selectedExam || !selectedSubject) {
      toast.error('Please select Batch, Exam and Subject');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get Exam Details (Max Marks)
      const { data: exam } = await supabase.from('exams').select('*').eq('id', selectedExam).single();
      setExamData(exam);

      // 2. Get Students and Existing Results
      const [studentsRes, resultsRes] = await Promise.all([
        supabase.from('students').select('*').eq('batch_id', selectedBatch).order('roll_number'),
        supabase.from('results')
          .select('*')
          .eq('exam_id', selectedExam)
          .eq('subject_id', selectedSubject)
      ]);

      setStudents(studentsRes.data || []);
      
      // Map results to marks and grades state
      const initialMarks: Record<string, string> = {};
      const initialGrades: Record<string, string> = {};
      (studentsRes.data || []).forEach(student => {
        const result = (resultsRes.data || []).find(r => r.student_id === student.id);
        if (result) {
          initialMarks[student.id] = result.gained_marks ? result.gained_marks.toString() : '';
          initialGrades[student.id] = result.grade || '';
        } else {
          initialMarks[student.id] = '';
          initialGrades[student.id] = '';
        }
      });
      setMarks(initialMarks);
      setGrades(initialGrades);
    } catch (err) {
      toast.error('Failed to load students or marks');
    } finally {
      setIsLoading(false);
    }
  };

  const handeMarkChange = (studentId: string, value: string) => {
    // Only allow numbers and empty string
    if (value === '' || (/^\d*\.?\d*$/.test(value))) {
      // Check if it exceeds max marks
      if (examData && value !== '') {
        const numVal = parseFloat(value);
        if (numVal > examData.out_of_marks) {
          toast.error(`Marks cannot exceed ${examData.out_of_marks}`, { id: 'max-marks-err' });
          return;
        }
      }
      setMarks(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGrades(prev => ({ ...prev, [studentId]: value }));
  };

  const saveAllMarks = async () => {
    if (!selectedBatch || !selectedExam || !selectedSubject) return;
    
    const currentSubject = subjects.find(s => s.id === selectedSubject);
    const isActuallyGraded = currentSubject?.is_graded || currentSubject?.name?.toLowerCase().includes('sport');
    setIsSaving(true);
    const loadingToast = toast.loading('Saving marks...');
    
    try {
      // Prepare upsert data
      const upsertData = students.map(student => {
        const gainedMarks = marks[student.id];
        const grade = grades[student.id];

        // For graded subjects, we need a grade. For non-graded, we need marks.
        if (isActuallyGraded) {
          if (!grade) return null;
          return {
            student_id: student.id,
            exam_id: selectedExam,
            subject_id: selectedSubject,
            gained_marks: 0,
            grade: grade
          };
        } else {
          if (gainedMarks === '') return null;
          return {
            student_id: student.id,
            exam_id: selectedExam,
            subject_id: selectedSubject,
            gained_marks: parseFloat(gainedMarks),
            grade: null
          };
        }
      }).filter(Boolean);

      if (upsertData.length === 0) {
        toast.error('No marks to save', { id: loadingToast });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('results')
        .upsert(upsertData, { 
          onConflict: 'student_id,subject_id,exam_id' 
        });

      if (error) throw error;
      
      toast.success('All marks saved successfully!', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save marks', { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Bulk Marks Entry">
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                <ClipboardList size={24} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Bulk Marks Entry</h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Quick Marks Management for Entire Class</p>
          </div>

          <div className="flex items-center gap-4">
             {students.length > 0 && (
                <button 
                  onClick={saveAllMarks}
                  disabled={isSaving}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save All Marks
                </button>
             )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Academic Batch</label>
            <div className="relative">
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none"
              >
                <option value="">Choose Batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.class_name} ({b.batch_code})</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Examination</label>
            <div className="relative">
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                disabled={!selectedBatch}
                className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none disabled:opacity-50"
              >
                <option value="">Choose Exam...</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.exam_name}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Subject</label>
            <div className="relative">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedBatch}
                className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none disabled:opacity-50"
              >
                <option value="">Choose Subject...</option>
                {subjects
                  .filter(s => {
                    const exam = exams?.find(e => e.id === selectedExam);
                    const isAnnual = exam?.exam_name ? exam.exam_name.toLowerCase().includes('annual') : false;
                    
                    // If the subject is some variant of "Sport", only show it in Annual exams
                    if (s.name?.toLowerCase().includes('sport')) {
                      return isAnnual;
                    }
                    
                    // Also maintain the general rule for graded subjects
                    if (s.is_graded) {
                      return isAnnual;
                    }
                    
                    return true;
                  })
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.is_graded ? '(Grade Only)' : ''}</option>
                  ))
                }
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <button 
            onClick={loadStudentsAndMarks}
            disabled={!selectedBatch || !selectedExam || !selectedSubject || isLoading}
            className="py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Fetch Students'}
          </button>
        </div>
      </div>

      {examData && (
        <div className="bg-indigo-600 rounded-2xl p-4 mb-8 flex items-center justify-between text-white shadow-lg shadow-indigo-100">
          <div className="flex items-center gap-3">
             <AlertCircle size={20} />
             <div className="text-sm font-bold uppercase tracking-wider">Marks Entry Mode: {examData.exam_name}</div>
          </div>
          <div className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            Maximum Marks: {examData.out_of_marks}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Class Roll...</p>
        </div>
      ) : students.length > 0 ? (
        <div className="space-y-6">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search student or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none transition-all font-bold text-slate-700 shadow-sm"
            />
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[11px] w-20 text-center">Roll No</th>
                  <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[11px]">Student Full Name</th>
                  <th className="p-6 font-black text-slate-400 uppercase tracking-widest text-[11px] w-48 text-right">
                    {(() => {
                      const curSub = subjects.find(s => s.id === selectedSubject);
                      return (curSub?.is_graded || curSub?.name?.toLowerCase().includes('sport')) ? 'Grade' : 'Marks Obtained';
                    })()}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((student) => {
                  const curSub = subjects.find(s => s.id === selectedSubject);
                  const isGraded = curSub?.is_graded || curSub?.name?.toLowerCase().includes('sport');
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="p-6 text-center font-bold text-slate-400 italic">
                        {student.roll_number}
                      </td>
                      <td className="p-6">
                        <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">
                          {student.student_name}
                        </p>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-end items-center gap-3">
                          {isGraded ? (
                            <div className="relative w-32">
                              <select
                                value={grades[student.id] || ''}
                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-black text-slate-700 appearance-none transition-all"
                              >
                                <option value="">Select...</option>
                                <option value="A+">A+</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="C">C</option>
                                <option value="D">D</option>
                                <option value="FAIL">FAIL</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <>
                              <input 
                                type="text"
                                value={marks[student.id] || ''}
                                onChange={(e) => handeMarkChange(student.id, e.target.value)}
                                placeholder="0"
                                className="w-32 px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none text-right font-black text-slate-700 transition-all placeholder:text-slate-300"
                              />
                              <span className="text-slate-300 font-bold">/ {examData?.out_of_marks}</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 py-32">
          <EmptyState 
            title="Bulk Marks Entry"
            description="Select a batch, exam, and subject to start entering marks for all students at once. This is the fastest way to upload results."
            icon={<Users size={48} className="text-slate-200" />}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default BulkMarksEntry;
