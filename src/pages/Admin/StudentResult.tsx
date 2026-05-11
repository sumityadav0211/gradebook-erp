import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  ArrowLeft,
  Loader2,
  Save,
  FileText,
  Trophy,
  AlertCircle,
  Hash,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  Download,
  Printer,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ResultPDF from '../../components/ResultPDF';
import ExamResultPDF from '../../components/PDF/ExamResultPDF';
import CombinedResultPDF from '../../components/PDF/CombinedResultPDF';
import PDFActionButtons from '../../components/PDF/PDFActionButtons';

interface Student {
  id: string;
  student_name: string;
  roll_number: string;
  mother_name?: string;
  reg_number?: string;
  pen_number?: string;
  seat_number?: string;
  batches: {
    id: string;
    class_name: string;
    batch_code: string;
    batch_year: number;
    colleges?: {
      college_code: string;
      college_name: string;
      id: string;
      logo_url?: string;
      portrait_url?: string;
      slogan?: string;
      sub_slogan?: string;
      address?: string;
      registration_number?: string;
    };
  };
}

interface Exam {
  id: string;
  exam_name: string;
  out_of_marks: number;
  created_at?: string;
}

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  is_graded?: boolean;
  subject_group?: string | null;
  noPreference?: boolean;
}

const StudentResult: React.FC = () => {
  const { batchId, studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, number>>({}); // subjectId -> gainedMarks
  const [subjectGrades, setSubjectGrades] = useState<Record<string, string>>({}); // subjectId -> grade
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [collegeData, setCollegeData] = useState<any>(null);
  const [pdfSettings, setPdfSettings] = useState<any>(null);
  const [combinedPDFData, setCombinedPDFData] = useState<any>(null);
  const [hasPreferenceWarning, setHasPreferenceWarning] = useState(false);

  const pdfRef = React.useRef<HTMLDivElement>(null);
  const examPdfRef = React.useRef<HTMLDivElement>(null);
  const combinedPdfRef = React.useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!studentId || !batchId || !user?.college_id) return;
    try {
      setIsLoading(true);
      
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, batches(*)')
        .eq('id', studentId)
        .single();
      
      if (studentError) throw studentError;
      setStudent(studentData as any);

      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });
      
      if (examsError) throw examsError;
      setExams(examsData || []);
      if (examsData?.length && !selectedExamId) setSelectedExamId(examsData[0].id);

      const { data: batchSubjectsData, error: batchSubjectsError } = await supabase
        .from('batch_subjects')
        .select('subjects(id, subject_name, subject_code, subject_group, is_graded)')
        .eq('batch_id', batchId);
      
      if (batchSubjectsError) throw batchSubjectsError;
      
      const allSubjects = (batchSubjectsData || []).map(bs => {
        const sub = bs.subjects;
        return Array.isArray(sub) ? sub[0] : sub;
      }).filter(Boolean) as Subject[];

      const preferences = (studentData as any).subject_preferences || {};
      
      // Group subjects by subject_group
      const groupedSubjects: Record<string, Subject[]> = {};
      const ungroupedSubjects: Subject[] = [];
      let foundWarning = false;

      allSubjects.forEach(subject => {
        if (subject.subject_group) {
          if (!groupedSubjects[subject.subject_group]) {
            groupedSubjects[subject.subject_group] = [];
          }
          groupedSubjects[subject.subject_group].push(subject);
        } else {
          ungroupedSubjects.push(subject);
        }
      });

      // Filter groups based on preference
      const filteredGroupSubjects: Subject[] = [];
      Object.entries(groupedSubjects).forEach(([group, groupSubjects]) => {
        if (preferences[group]) {
          const preferred = groupSubjects.find(s => s.id === preferences[group]);
          if (preferred) {
            filteredGroupSubjects.push(preferred);
          } else {
            // Priority mismatch, show all as fallback
            filteredGroupSubjects.push(...groupSubjects);
          }
        } else {
          // No preference set, show all with warning flag
          foundWarning = true;
          groupSubjects.forEach(s => {
            filteredGroupSubjects.push({ ...s, noPreference: true });
          });
        }
      });

      const finalSubjects = [...ungroupedSubjects, ...filteredGroupSubjects];
      setSubjects(finalSubjects);
      setHasPreferenceWarning(foundWarning);

      const { data: collegeObj, error: collegeError } = await supabase
        .from('colleges')
        .select('*')
        .eq('id', user.college_id)
        .single();
      
      if (collegeError) throw collegeError;
      setCollegeData(collegeObj);

      // Fetch PDF Settings
      const { data: psData } = await supabase
        .from('pdf_settings')
        .select('*')
        .eq('college_id', user.college_id)
        .single();
      
      if (psData) setPdfSettings(psData);

      const { data: allResults } = await supabase
        .from('results')
        .select('*, exams(*)')
        .eq('student_id', studentId);

      const marksMap: any = {};
      (allResults || []).forEach((res: any) => {
        if (!marksMap[res.subject_id]) marksMap[res.subject_id] = {};
        marksMap[res.subject_id][res.exam_id] = {
          gained_marks: res.gained_marks,
          out_of_marks: res.exams.out_of_marks,
          grade: res.grade
        };
      });

      setCombinedPDFData({
        student: studentData,
        college: collegeObj,
        batch: studentData.batches,
        exams: (examsData || []).slice().reverse(),
        subjects: finalSubjects,
        marksData: marksMap
      });

    } catch (error: any) {
      toast.error('Could not load student profile');
      navigate(`/admin/batches/${batchId}/students`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingResults = async () => {
    if (!studentId || !selectedExamId || selectedExamId === 'aggregate') return;
    try {
      const { data, error } = await supabase
        .from('results')
        .select('subject_id, gained_marks, grade')
        .eq('student_id', studentId)
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
      console.error('Error fetching results:', error.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId, batchId, user]);

  useEffect(() => {
    fetchExistingResults();
  }, [selectedExamId, studentId]);

  const handleMarkChange = (subjectId: string, value: string, maxMarks: number) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;
    if (numValue > maxMarks) {
      toast.error(`Marks cannot exceed ${maxMarks}`);
      return;
    }
    setMarks(prev => ({ ...prev, [subjectId]: numValue }));
  };

  const calculateTotals = (): { totalGained: number; totalOut: number; percentage: number } => {
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
      const aggG = totalG / 2;
      const aggO = totalO / 2;
      const pct = aggO > 0 ? (aggG / aggO) * 100 : 0;
      return { totalGained: aggG, totalOut: aggO, percentage: pct };
    }

    const selectedExam = exams.find(e => e.id === selectedExamId);
    if (!selectedExam) return { totalGained: 0, totalOut: 0, percentage: 0 };

    let totalG = 0;
    let nongradedCount = 0;
    subjects.forEach(s => {
      if (!s.is_graded) {
        totalG += marks[s.id] || 0;
        nongradedCount++;
      }
    });

    const totalO = nongradedCount * selectedExam.out_of_marks;
    const pct = totalO > 0 ? (totalG / totalO) * 100 : 0;
    return { totalGained: totalG, totalOut: totalO, percentage: pct };
  };

  const handleSave = async () => {
    if (!studentId || !selectedExamId || selectedExamId === 'aggregate' || !user?.college_id) return;
    
    setIsSaving(true);
    try {
      const resultData = subjects.map(subject => ({
        student_id: studentId,
        exam_id: selectedExamId,
        subject_id: subject.id,
        gained_marks: subject.is_graded ? 0 : (marks[subject.id] || 0),
        grade: subject.is_graded ? (subjectGrades[subject.id] || 'N/A') : null
      }));

      const { error } = await supabase
        .from('results')
        .upsert(resultData, { onConflict: 'student_id,subject_id,exam_id' });

      if (error) throw error;
      toast.success('Examination results saved');
      await fetchData(); 
    } catch (error: any) {
      toast.error('Failed to commit results');
    } finally {
      setIsSaving(false);
    }
  };

  const { totalGained, totalOut, percentage } = calculateTotals();
  const selectedExam = exams.find(e => e.id === selectedExamId);
  const isAggregate = selectedExamId === 'aggregate';
  const outOf = selectedExam?.out_of_marks || 0;

  const failCount = subjects.filter(s => {
    if (s.is_graded) return false;
    if (isAggregate) {
      return exams.some(ex => {
        const mark = combinedPDFData?.marksData?.[s.id]?.[ex.id];
        if (!mark) return false;
        return (mark.gained_marks / mark.out_of_marks) * 100 < 35;
      });
    }
    const gained = marks[s.id] !== undefined ? Number(marks[s.id]) : 0;
    const pct = outOf > 0 ? (gained / outOf) * 100 : 0;
    return pct < 35;
  }).length;

  const isPass = subjects.length > 0 && failCount === 0 && percentage >= 35 && (isAggregate || Object.keys(marks).length > 0);

  if (isLoading) {
    return (
      <DashboardLayout title="Performance Evaluator">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-primary-600" size={48} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Grade Records">
      {/* Student Info Header Card */}
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(`/admin/batches/${batchId}/students`)}
            className="flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-700 uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Back to Roster
          </button>
          <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
            Class: {student?.batches.class_name} ({student?.batches.batch_code})
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/5 rounded-full -mr-16 -mt-16"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-slate-950/20">
                {student?.student_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{student?.student_name}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-mono text-xs font-black text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                    ROLL: {student?.roll_number}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Hash size={14} /> ID: {student?.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {student && collegeData && (
                <PDFActionButtons 
                  student={student}
                  college={collegeData}
                  batch={student.batches}
                  exam={selectedExam}
                  examResults={subjects.map(s => ({
                    subject_name: s.subject_name,
                    gained_marks: marks[s.id] || 0,
                    out_of_marks: selectedExam?.out_of_marks || 0,
                    is_graded: !!s.is_graded,
                    grade: s.is_graded ? (subjectGrades[s.id] || 'N/A') : undefined
                  }))}
                  pdfSettings={pdfSettings}
                  compact={false}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Exam Selector - Tabs */}
      <div className="mb-6 overflow-x-auto custom-scrollbar pb-2">
        <div className="flex gap-2 min-w-max">
           <button 
             onClick={() => setSelectedExamId('aggregate')}
             className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
               selectedExamId === 'aggregate' 
                 ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                 : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
             }`}
           >
             Annual Aggregate
           </button>
           {exams.map(exam => (
             <button 
               key={exam.id}
               onClick={() => setSelectedExamId(exam.id)}
               className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                 selectedExamId === exam.id 
                   ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                   : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
               }`}
             >
               {exam.exam_name}
               <span className={`text-[10px] opacity-70 font-bold px-1.5 py-0.5 rounded ${selectedExamId === exam.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                 {exam.out_of_marks}M
               </span>
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence>
        {hasPreferenceWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4 shadow-sm"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">Subject Preferences Missing</h3>
              <p className="text-xs font-bold text-amber-600/80 leading-relaxed uppercase tracking-wide">
                Some alternative subjects have no preference set for this student. 
                <button 
                  onClick={() => navigate(`/admin/batches/${batchId}/students`)}
                  className="ml-1 text-amber-900 underline decoration-amber-300 hover:decoration-amber-500 underline-offset-4"
                >
                  Configure student profile
                </button> to resolve this.
              </p>
            </div>
            <button 
              onClick={() => setHasPreferenceWarning(false)}
              className="p-2 hover:bg-amber-100 rounded-xl text-amber-400 transition-colors"
            >
              <ArrowLeft className="rotate-90" size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Table */}
      <div className="table-wrapper mb-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject Information</th>
              <th className="text-center w-32">Gained Marks</th>
              <th className="text-center w-32">Out Of</th>
              <th className="text-center w-24">%</th>
              <th className="text-right w-32">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {subjects.map((subject) => {
              const gained = subject.is_graded ? 0 : (marks[subject.id] || 0);
              const subjectOutOf = selectedExam?.out_of_marks || 100;
              const subjectPct = subjectOutOf > 0 ? (gained / subjectOutOf) * 100 : 0;
              const isFailedRow = !subject.is_graded && !isAggregate && subjectPct < 35;

              return (
                <tr key={subject.id} className={`transition-all ${isFailedRow ? 'bg-red-50/50' : 'hover:bg-primary-50/10'}`}>
                  <td>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-slate-800">{subject.subject_name}</p>
                      {subject.subject_group && (
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          subject.noPreference 
                            ? 'bg-amber-50 text-amber-600 border-amber-100' 
                            : 'bg-primary-50 text-primary-600 border-primary-100'
                        }`}>
                          ALT GROUP: {subject.subject_group}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">{subject.subject_code}</p>
                  </td>
                  <td className="text-center">
                    {subject.is_graded ? (
                      <select 
                        className="bg-white border text-center border-slate-200 rounded-lg px-2 py-1.5 text-sm font-black text-purple-600 w-20 focus:ring-2 focus:ring-purple-500/20 outline-none"
                        value={subjectGrades[subject.id] || ''}
                        onChange={(e) => setSubjectGrades(prev => ({ ...prev, [subject.id]: e.target.value }))}
                      >
                         <option value="">-</option>
                         <option value="A+">A+</option>
                         <option value="A">A</option>
                         <option value="B">B</option>
                         <option value="C">C</option>
                         <option value="D">D</option>
                         <option value="PASS">P</option>
                         <option value="FAIL">F</option>
                      </select>
                    ) : (
                      <input 
                        type="number"
                        className="input-field text-center !py-1.5 !px-2 font-black text-slate-700 w-20 mx-auto"
                        value={marks[subject.id] === undefined ? '' : marks[subject.id]}
                        onChange={(e) => handleMarkChange(subject.id, e.target.value, subjectOutOf)}
                        placeholder="0"
                      />
                    )}
                  </td>
                  <td className="text-center">
                    <span className="text-sm font-bold text-slate-400">
                      {subject.is_graded ? 'GRD' : subjectOutOf}
                    </span>
                  </td>
                  <td className="text-center">
                     <span className={`text-xs font-black font-mono ${subjectPct < 35 && !subject.is_graded ? 'text-red-500' : 'text-slate-500'}`}>
                       {subject.is_graded ? '-' : `${subjectPct.toFixed(0)}%`}
                     </span>
                  </td>
                  <td className="text-right">
                     {subject.is_graded ? (
                       <span className="badge badge-purple uppercase">Graded</span>
                     ) : (
                       <span className={`badge ${subjectPct >= 35 ? 'badge-green' : 'badge-red'}`}>
                         {subjectPct >= 35 ? 'PASS' : 'FAIL'}
                       </span>
                     )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Card */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden mb-24 lg:mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-8">
             <div className="text-center md:text-left border-r border-white/10 pr-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black">{totalGained}</span>
                   <span className="text-xl text-slate-500">/ {totalOut}</span>
                </div>
             </div>
             <div className="text-center md:text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Percentage</p>
                <p className={`text-4xl font-black ${percentage >= 35 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {percentage.toFixed(1)}%
                </p>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="text-center md:text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Outcome</p>
                <span className={`inline-flex px-6 py-2 rounded-2xl font-black text-xl tracking-tighter ${
                  isPass ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                }`}>
                  {isPass ? 'PROMOTED / PASS' : 'FAILED / ATKT'}
                </span>
             </div>
             {isPass && <Trophy size={48} className="text-amber-400 animate-bounce" />}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 lg:hidden z-30">
        <div className="flex gap-3">
          {!isAggregate && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 btn-primary py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>Save Results</span>
            </button>
          )}
          <button 
            className="w-14 h-14 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200"
            onClick={() => window.print()}
          >
            <Printer size={20} />
          </button>
          <button 
            className="w-14 h-14 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Primary Action Row - Desktop */}
      <div className="hidden lg:flex justify-end gap-3 pb-8">
        {!isAggregate && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-12 py-4 rounded-2xl flex items-center gap-2 shadow-xl shadow-primary-600/20"
          >
            {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
            <span className="font-black">Save Examination Results</span>
          </button>
        )}
      </div>

      {/* Hidden PDF Templates and other background components */}
      <div className="hidden">
        {student && selectedExam && (
          <ResultPDF 
            ref={pdfRef}
            student={student}
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
            pdfSettings={pdfSettings}
          />
        )}
        {student && selectedExam && collegeData && (
          <ExamResultPDF
            ref={examPdfRef}
            student={student}
            exam={selectedExam}
            results={subjects.map(s => ({
              subject_name: s.subject_name,
              gained_marks: marks[s.id] || 0,
              out_of_marks: selectedExam.out_of_marks,
              is_graded: s.is_graded,
              grade: s.is_graded ? (subjectGrades[s.id] || 'N/A') : undefined
            }))}
            college={collegeData}
            pdfSettings={pdfSettings}
          />
        )}
        {combinedPDFData && (
          <CombinedResultPDF
            ref={combinedPdfRef}
            student={combinedPDFData.student}
            college={combinedPDFData.college}
            batch={combinedPDFData.batch}
            exams={combinedPDFData.exams}
            subjects={combinedPDFData.subjects}
            marksData={combinedPDFData.marksData}
            pdfSettings={pdfSettings}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentResult;
