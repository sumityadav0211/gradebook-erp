import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Search, 
  User as UserIcon, 
  ArrowLeft, 
  Loader2,
  GraduationCap,
  ClipboardCheck,
  ChevronDown,
  Layers,
  Save,
  Printer,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ResultPDF from '../../components/ResultPDF';
import EmptyState from '../../components/EmptyState';
import CombinedResultPDF from '../../components/PDF/CombinedResultPDF';
import PDFActionButtons from '../../components/PDF/PDFActionButtons';

interface Batch {
  id: string;
  batch_code: string;
  class_name: string;
  batch_year: number;
  colleges?: {
    college_code: string;
  };
}

interface Student {
  id: string;
  student_name: string;
  roll_number: string;
  created_at: string;
  mother_name?: string;
  registration_number?: string;
  pen_number?: string;
  exam_set_number?: string;
}

interface Exam {
  id: string;
  exam_name: string;
  out_of_marks: number;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  is_graded?: boolean;
  subject_group?: string | null;
}

const TeacherStudents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Evaluation View States
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [subjectGrades, setSubjectGrades] = useState<Record<string, string>>({});
  const [isSubmittingMarks, setIsSubmittingMarks] = useState(false);
  const [collegeName, setCollegeName] = useState<string>('');
  const [collegeData, setCollegeData] = useState<{ 
    college_name: string; 
    college_code: string; 
    id: string;
    slogan?: string;
    sub_slogan?: string;
    logo_url?: string;
    portrait_url?: string;
    address?: string;
    institute_name?: string;
    registration_number?: string;
  } | null>(null);
  const [combinedPDFData, setCombinedPDFData] = useState<any>(null);

  const combinedPdfRef = React.useRef<HTMLDivElement>(null);

  const fetchBaseData = async () => {
    if (!user?.college_id) return;
    try {
      setIsLoading(true);
      
      const [batchesRes, collegeRes] = await Promise.all([
        supabase
          .from('batches')
          .select('id, college_id, batch_code, class_name, batch_year, colleges(college_code)')
          .eq('college_id', user.college_id)
          .order('batch_code', { ascending: true }),
        supabase
          .from('colleges')
          .select('*')
          .eq('id', user.college_id)
          .single()
      ]);

      if (batchesRes.error) throw batchesRes.error;
      setBatches(batchesRes.data || []);
      setCollegeName(collegeRes.data?.college_name || '');
      setCollegeData({
        college_name: collegeRes.data?.college_name || '',
        college_code: collegeRes.data?.college_code || 'N/A',
        id: user.college_id,
        slogan: collegeRes.data?.slogan,
        sub_slogan: collegeRes.data?.sub_slogan,
        logo_url: collegeRes.data?.logo_url,
        portrait_url: collegeRes.data?.portrait_url,
        address: collegeRes.data?.address,
        institute_name: collegeRes.data?.institute_name,
        registration_number: collegeRes.data?.registration_number
      });

      if (batchesRes.data?.length && !batchId) {
        setSearchParams({ batchId: batchesRes.data[0].id });
      }
    } catch (error: any) {
      toast.error('Failed to load institution data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!batchId) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('batch_id', batchId)
        .order('roll_number', { ascending: true });
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error('Failed to load roster');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvaluationMeta = async () => {
    if (!batchId || !activeStudent) return;
    try {
      const [examsRes, subjectsRes, allResultsRes, studentRes] = await Promise.all([
        supabase.from('exams').select('*').eq('batch_id', batchId).order('created_at', { ascending: false }),
        supabase.from('batch_subjects').select('subjects(*)').eq('batch_id', batchId),
        supabase.from('results').select('*, exams(*)').eq('student_id', activeStudent.id),
        supabase.from('students').select('subject_preferences').eq('id', activeStudent.id).single()
      ]);

      const examsData = examsRes.data || [];
      setExams(examsData);
      if (examsData?.length) setSelectedExamId(examsData[0].id);
      
      const allSubjects = (subjectsRes.data || []).map(bs => (bs.subjects as any));
      const preferences = studentRes.data?.subject_preferences || {};

      const formattedSubjects = allSubjects.filter(sub => {
        if (!sub.subject_group) return true;
        const preferredId = preferences[sub.subject_group];
        if (!preferredId) return true;
        return sub.id === preferredId;
      });

      setSubjects(formattedSubjects);

      // Prepare Combined Data for Aggregate View
      const marksMap: any = {};
      (allResultsRes.data || []).forEach((res: any) => {
        if (!marksMap[res.subject_id]) marksMap[res.subject_id] = {};
        marksMap[res.subject_id][res.exam_id] = {
          gained_marks: res.gained_marks,
          out_of_marks: res.exams.out_of_marks,
          grade: res.grade,
          is_graded: formattedSubjects.find(s => s.id === res.subject_id)?.is_graded
        };
      });

      if (collegeData) {
        setCombinedPDFData({
          student: activeStudent,
          college: collegeData,
          batch: batches.find(b => b.id === batchId),
          exams: [...examsData].reverse(),
          subjects: formattedSubjects,
          marksData: marksMap
        });
      }
    } catch (error: any) {
      toast.error('Failed to load evaluation context');
    }
  };

  const fetchMarks = async () => {
    if (!activeStudent || !selectedExamId || selectedExamId === 'aggregate') return;
    try {
      const { data, error } = await supabase
        .from('results')
        .select('subject_id, gained_marks, grade')
        .eq('student_id', activeStudent.id)
        .eq('exam_id', selectedExamId);
      
      if (error) throw error;
      const resultsMap: Record<string, number> = {};
      const gradesMap: Record<string, string> = {};
      data?.forEach(r => { 
        resultsMap[r.subject_id] = r.gained_marks;
        gradesMap[r.subject_id] = r.grade || '';
      });
      setMarks(resultsMap);
      setSubjectGrades(gradesMap);
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => { fetchBaseData(); }, [user]);
  useEffect(() => { fetchStudents(); }, [batchId]);
  useEffect(() => { if (activeStudent) fetchEvaluationMeta(); }, [activeStudent]);
  useEffect(() => { if (selectedExamId && activeStudent) fetchMarks(); }, [selectedExamId, activeStudent]);

  const handleSaveMarks = async () => {
    if (!activeStudent || !selectedExamId || selectedExamId === 'aggregate') return;
    setIsSubmittingMarks(true);
    try {
      const isAnnual = selectedExam?.exam_name?.toLowerCase().includes('annual');
      const resultData = subjects
        .filter(s => !s.is_graded || isAnnual)
        .map(s => ({
          student_id: activeStudent.id,
          exam_id: selectedExamId,
          subject_id: s.id,
          gained_marks: s.is_graded ? 0 : (marks[s.id] || 0),
          grade: s.is_graded ? (subjectGrades[s.id] || '') : null
        }));

      const { error } = await supabase
        .from('results')
        .upsert(resultData, { onConflict: 'student_id,subject_id,exam_id' });

      if (error) throw error;
      toast.success('Performance marks updated successfully');
      await fetchEvaluationMeta();
    } catch (error: any) {
      toast.error('Failed to save assessment');
    } finally {
      setIsSubmittingMarks(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateTotals = () => {
    const selectedExam = exams.find(e => e.id === selectedExamId);
    const isAggregate = selectedExamId === 'aggregate';
    
    if (isAggregate) {
      let totalG = 0;
      let totalO = 0;
      subjects.forEach(s => {
        if (!s.is_graded && combinedPDFData?.marksData?.[s.id]) {
          Object.values(combinedPDFData.marksData[s.id]).forEach((m: any) => {
            totalG += Number(m.gained_marks || 0);
            totalO += Number(m.out_of_marks || 0);
          });
        }
      });
      // Aggregate logic: totalG / 2 vs totalO / 2
      const aggG = totalG / 2;
      const aggO = totalO / 2;
      const pct = aggO > 0 ? (aggG / aggO) * 100 : 0;
      
      // Check pass/fail for aggregate
      const failCount = subjects.filter(s => {
        if (s.is_graded) {
          return exams.some(ex => {
            const mark = combinedPDFData?.marksData?.[s.id]?.[ex.id];
            return mark && mark.grade === 'FAIL';
          });
        }
        return exams.some(ex => {
          const mark = combinedPDFData?.marksData?.[s.id]?.[ex.id];
          if (!mark) return false;
          return (mark.gained_marks / mark.out_of_marks) * 100 < 35;
        });
      }).length;

      return { 
        totalGained: aggG, 
        totalOut: aggO, 
        percentage: pct, 
        isPass: subjects.length > 0 && failCount === 0 && pct >= 35, 
        isAggregate 
      };
    }
    
    if (!selectedExam) return { totalGained: 0, totalOut: 0, percentage: 0, isPass: false, isAggregate };
    
    const numericSubjects = subjects.filter(s => !s.is_graded);
    const totalGained = numericSubjects.reduce((a, s) => a + (marks[s.id] || 0), 0);
    const totalOut = numericSubjects.length * (selectedExam?.out_of_marks || 0);
    const percentage = totalOut > 0 ? (totalGained / totalOut) * 100 : 0;
    
    // Student passes ONLY if ALL subjects have >= 35%
    const examFailCount = subjects.filter(s => {
      if (s.is_graded) return subjectGrades[s.id] === 'FAIL';
      const gained = marks[s.id] || 0;
      const pct = (selectedExam?.out_of_marks || 0) > 0 ? (gained / (selectedExam?.out_of_marks || 0)) * 100 : 0;
      return pct < 35;
    }).length;

    const isPass = subjects.length > 0 && examFailCount === 0 && (numericSubjects.length === 0 || percentage >= 35);

    return { totalGained, totalOut, percentage, isPass, isAggregate };
  };

  const { totalGained, totalOut, percentage, isPass, isAggregate } = calculateTotals();
  const selectedExam = exams.find(e => e.id === selectedExamId);

  return (
    <DashboardLayout title={activeStudent ? "Student Evaluation" : "Performance Roster"}>
      <AnimatePresence mode="wait">
        {!activeStudent ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* List Controls */}
            <div className="flex items-center gap-[10px] w-full max-w-full overflow-hidden box-border mb-8">
              <div className="relative flex-1 min-w-0 w-0 max-w-full box-border">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="Filter by name or roll..."
                  className="input-field pl-12 bg-white shadow-sm w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="relative flex-1 min-w-0 md:min-w-[280px]">
                <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" size={18} />
                <select 
                  className="input-field sm:pl-12 pr-10 appearance-none bg-white shadow-sm font-bold w-full"
                  value={batchId || ''}
                  onChange={(e) => setSearchParams({ batchId: e.target.value })}
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.colleges?.college_code 
                        ? (b.batch_code.startsWith(`${b.colleges.college_code}-`) 
                            ? b.batch_code 
                            : `${b.colleges.college_code}-${b.batch_code}`)
                        : b.batch_code} (Class {b.class_name})
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hidden sm:block" />
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Roll No.</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Identity</th>
                    <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <tr key={i} className="animate-pulse"><td colSpan={3} className="p-10 h-20 bg-slate-50/20"></td></tr>
                    ))
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="p-6">
                          <span className="font-mono font-black text-lg text-slate-900">{s.roll_number}</span>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center justify-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 border border-slate-200">
                              {s.student_name.charAt(0)}
                            </div>
                            <span className="font-extrabold text-slate-800 text-lg group-hover:text-primary-600 transition-colors">
                              {s.student_name}
                            </span>
                          </div>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                             {collegeData && batches.find(b => b.id === batchId) && (
                               <PDFActionButtons 
                                 student={{
                                   ...s,
                                   batches: batches.find(b => b.id === batchId)
                                 }}
                                 college={collegeData}
                                 batch={batches.find(b => b.id === batchId)}
                               />
                             )}
                             <button 
                               onClick={() => setActiveStudent(s)}
                               className="btn-primary px-6 py-2.5 rounded-2xl flex items-center gap-2 inline-flex"
                             >
                               <ClipboardCheck size={18} />
                               <span>Evaluate</span>
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        <EmptyState 
                          icon={UserIcon}
                          title={searchTerm ? "No match found" : "Roster empty"}
                          message={searchTerm ? `The record search for "${searchTerm}" returned no matches in this cohort.` : "The academic roster for this batch is currently unoccupied."}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="eval"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Eval Header */}
            <div className="mb-8 flex flex-col lg:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setActiveStudent(null)}
                  className="p-4 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-primary-600 transition-all hover:bg-slate-50"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-black text-primary-600 bg-primary-100 px-3 py-1 rounded-xl uppercase tracking-tighter">
                      ROLL: {activeStudent.roll_number}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {(() => {
                        const b = batches.find(b => b.id === batchId);
                        if (!b) return '';
                        const colCode = b.colleges?.college_code;
                        if (!colCode) return b.batch_code;
                        return b.batch_code.startsWith(`${colCode}-`) ? b.batch_code : `${colCode}-${b.batch_code}`;
                      })()}
                    </span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">{activeStudent.student_name}</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative min-w-[240px]">
                  <ClipboardCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    className="input-field pl-12 h-14 bg-white shadow-sm border-slate-200 font-bold"
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                  >
                    <option value="aggregate">Aggregate Result (All Exams)</option>
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.exam_name} (Max: {ex.out_of_marks})</option>
                    ))}
                  </select>
                </div>
                
                {activeStudent && collegeData && batches.find(b => b.id === batchId) && (
                  <PDFActionButtons 
                    student={{
                      ...activeStudent,
                      batches: batches.find(b => b.id === batchId)
                    }}
                    college={collegeData}
                    batch={batches.find(b => b.id === batchId)}
                    exam={selectedExam}
                    examResults={subjects.map(s => ({
                      subject_name: s.subject_name,
                      gained_marks: marks[s.id] || 0,
                      out_of_marks: selectedExam?.out_of_marks || 0,
                      is_graded: !!s.is_graded,
                      grade: s.is_graded ? (subjectGrades[s.id] || 'N/A') : undefined
                    }))}
                  />
                )}
              </div>
            </div>

            {/* Entry Form */}
            <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-slate-200/50 border border-white">
              <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-slate-50/30 mb-8">
                <table className="w-full text-left min-w-max">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Context</th>
                      {isAggregate ? (
                        exams.map(ex => (
                          <th key={ex.id} className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{ex.exam_name}</th>
                        ))
                      ) : (
                        <>
                          <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Score Entry</th>
                          <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Max Possible</th>
                        </>
                      )}
                      {isAggregate && <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aggregate</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.filter(s => !s.is_graded || selectedExam?.exam_name?.toLowerCase().includes('annual')).map((sub) => {
                      const subAggregate = isAggregate && combinedPDFData?.marksData?.[sub.id] ? (() => {
                        let totalG = 0;
                        let totalO = 0;
                        let lastG = '';
                        const sortedExams = [...exams].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
                        
                        sortedExams.forEach((ex) => {
                          const m = combinedPDFData.marksData[sub.id][ex.id];
                          if (m) {
                            totalG += m.gained_marks || 0;
                            totalO += m.out_of_marks || 0;
                            if (sub.is_graded) {
                              lastG = m.grade || lastG;
                            }
                          }
                        });

                        if (!sub.is_graded) {
                          return { gained: totalG / 2, out: totalO / 2 };
                        }
                        return { gained: 0, out: 0, grade: lastG || '-' };
                      })() : null;

                      return (
                        <tr 
                          key={sub.id} 
                          className={`transition-colors group ${
                            !isAggregate && !sub.is_graded && marks[sub.id] !== undefined && 
                            ((marks[sub.id] / (selectedExam?.out_of_marks || 100)) * 100 < 35)
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'hover:bg-white'
                          }`}
                        >
                          <td className="p-6">
                              <div className="flex flex-col">
                                <p className="font-black text-slate-800 tracking-tight text-lg">{sub.subject_name}</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-mono font-bold text-slate-400">{sub.subject_code}</p>
                                  {sub.is_graded && (
                                    <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-0.5 rounded-full font-bold">GRADE BASED</span>
                                  )}
                                </div>
                              </div>
                          </td>
                          {isAggregate ? (
                            <>
                              {exams.map(ex => {
                                const mark = combinedPDFData?.marksData?.[sub.id]?.[ex.id];
                                if (sub.is_graded) {
                                  return (
                                    <td key={ex.id} className="p-6 text-center">
                                      <span className={`font-black ${mark?.grade === 'FAIL' ? 'text-red-500' : 'text-purple-600'}`}>
                                        {mark?.grade || '-'}
                                      </span>
                                    </td>
                                  );
                                }
                                const pct = mark ? (mark.gained_marks / mark.out_of_marks) * 100 : 0;
                                return (
                                  <td key={ex.id} className="p-6 text-center">
                                    <span className={`font-bold ${mark && pct < 35 ? 'text-red-500' : 'text-slate-600'}`}>
                                      {mark ? mark.gained_marks : '-'}
                                    </span>
                                  </td>
                                );
                              })}
                              <td className={`p-6 text-center font-black ${sub.is_graded ? 'text-purple-600' : 'text-primary-600'}`}>
                                {sub.is_graded ? (subAggregate?.grade || '-') : (subAggregate ? `${subAggregate.gained.toFixed(1)}/${subAggregate.out.toFixed(1)}` : '-')}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-6">
                                  {sub.is_graded ? (
                                    <select
                                      className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-6 font-black text-2xl text-purple-600 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all"
                                      value={subjectGrades[sub.id] || ''}
                                      onChange={(e) => setSubjectGrades({...subjectGrades, [sub.id]: e.target.value})}
                                    >
                                      <option value="">Select Grade</option>
                                      <option value="A+">A+</option>
                                      <option value="A">A</option>
                                      <option value="B">B</option>
                                      <option value="C">C</option>
                                      <option value="D">D</option>
                                      <option value="FAIL">FAIL</option>
                                    </select>
                                  ) : (
                                    <input 
                                      type="number"
                                      className="w-full h-14 bg-white border-2 border-slate-100 rounded-2xl px-6 font-black text-2xl text-primary-600 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 outline-none transition-all"
                                      value={marks[sub.id] === undefined ? '' : marks[sub.id]}
                                      onChange={(e) => {
                                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        if (val > (selectedExam?.out_of_marks || 100)) {
                                          toast.error("Exceeds max marks");
                                          return;
                                        }
                                        setMarks({...marks, [sub.id]: val});
                                      }}
                                    />
                                  )}
                              </td>
                              <td className="p-6">
                                <span className="text-2xl font-black text-slate-300">
                                  {sub.is_graded ? 'GRADE TYPE' : `/ ${selectedExam?.out_of_marks || 100}`}
                                </span>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900">
                    <tr>
                      <td className="p-10">
                        <p className="text-white font-black text-3xl tracking-tight">{isAggregate ? 'Aggregate Summary' : 'Aggregate Assessment'}</p>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                          {isAggregate ? 'Combined statistics for all assessment cycles' : 'Calculated totals for current exam cycle'}
                        </p>
                      </td>
                      {isAggregate ? (
                        <>
                          {exams.map(ex => {
                            let examGained = 0;
                            subjects.forEach(s => {
                              examGained += combinedPDFData?.marksData?.[s.id]?.[ex.id]?.gained_marks || 0;
                            });
                            return (
                              <td key={ex.id} className="p-10 text-center">
                                <p className="text-4xl font-black text-white">{examGained}</p>
                              </td>
                            );
                          })}
                          <td className="p-10 text-center">
                            <p className="text-4xl font-black text-amber-400">
                              {(() => {
                                 let totalG = 0;
                                 subjects.forEach(s => {
                                   if (combinedPDFData?.marksData?.[s.id]) {
                                     Object.values(combinedPDFData.marksData[s.id]).forEach((m: any) => {
                                       totalG += m.gained_marks;
                                     });
                                   }
                                 });
                                 return totalG;
                              })()}
                            </p>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-10">
                            <p className="text-5xl font-black text-white">{totalGained}</p>
                          </td>
                          <td className="p-10">
                            <p className="text-5xl font-black text-white/20">/ {totalOut}</p>
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-10">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Final Percentage</p>
                      <div className="flex items-center gap-6">
                        <span className={`text-7xl font-black tracking-tighter ${isPass ? 'text-emerald-500' : 'text-red-500'}`}>
                          {percentage.toFixed(1)}%
                        </span>
                        <div className={`px-6 py-3 rounded-2xl border-4 ${isPass ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-red-50 border-red-500 text-red-700'} font-black tracking-widest shadow-xl shadow-slate-200/50`}>
                          {isPass ? 'PASS' : 'FAIL'}
                        </div>
                      </div>
                   </div>
                </div>

                {!isAggregate && (
                  <button 
                    onClick={handleSaveMarks}
                    disabled={isSubmittingMarks || !selectedExamId}
                    className="w-full md:w-auto px-16 h-20 bg-slate-900 text-white font-black rounded-[2rem] hover:bg-slate-800 transition-all flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/10 active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingMarks ? <Loader2 size={32} className="animate-spin" /> : <Save size={32} />}
                    <span className="text-xl">Commit Evaluation</span>
                  </button>
                )}
              </div>
            </div>

            {/* Hidden PDF Template */}
            {activeStudent && selectedExam && batches.find(b => b.id === batchId) && (
              <ResultPDF 
                student={{
                  ...activeStudent,
                  batches: batches.find(b => b.id === batchId)!
                }}
                exam={selectedExam}
                results={subjects.map(s => ({
                  subject_name: s.subject_name,
                  subject_code: s.subject_code,
                  gained_marks: marks[s.id] || 0,
                  out_of_marks: selectedExam.out_of_marks,
                  is_graded: s.is_graded,
                  grade: s.is_graded ? (subjectGrades[s.id] || 'N/A') : undefined
                }))}
                college={collegeData}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {combinedPDFData && (
        <CombinedResultPDF
          ref={combinedPdfRef}
          student={combinedPDFData.student}
          college={combinedPDFData.college}
          batch={combinedPDFData.batch}
          exams={combinedPDFData.exams}
          subjects={combinedPDFData.subjects}
          marksData={combinedPDFData.marksData}
        />
      )}

      {!isLoading && !batches.length && (
         <div className="py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <EmptyState 
              icon={AlertCircle}
              title="Access Restricted"
              message="No academic batches or examination cycles have been linked to your institution credentials. Please contact administration for curriculum mapping."
            />
         </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherStudents;
