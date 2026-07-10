import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  ChevronDown, 
  Download, 
  Loader2,
  Printer,
  FileText,
  FileDown,
  Layers,
  ClipboardList
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';
import ConsolidatedReportPDF from '../../components/PDF/ConsolidatedReportPDF';
import { generateConsolidatedPDF } from '../../utils/generateConsolidatedPDF';
import generateCombinedPDF from '../../utils/generateCombinedPDF';
import generateExamPDF from '../../utils/generateExamPDF';
import generateBatchAnnualPDF from '../../utils/generateBatchAnnualPDF';

const ResultReport: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [collegeData, setCollegeData] = useState<any>(null);
  const [pdfSettings, setPdfSettings] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const isAggregateSelected = selectedExam === 'aggregate';
  
  // Extra fields for PDF
  const [className, setClassName] = useState('');
  const [classTeacher, setClassTeacher] = useState('');

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isMergingPDF, setIsMergingPDF] = useState(false);

  const fetchInitialData = useCallback(async () => {
    if (!user?.college_id) return;
    try {
      const [
        { data: batchesData },
        { data: college },
        { data: psData }
      ] = await Promise.all([
        supabase
          .from('batches')
          .select('*, colleges(college_code)')
          .eq('college_id', user.college_id)
          .order('batch_code'),
        supabase
          .from('colleges')
          .select('*')
          .eq('id', user.college_id)
          .single(),
        supabase
          .from('pdf_settings')
          .select('*')
          .eq('college_id', user.college_id)
          .single()
      ]);
      
      setBatches(batchesData || []);
      setCollegeData(college);
      if (psData) setPdfSettings(psData);
    } catch (err) {
      toast.error('Failed to load filters');
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedBatch) {
      fetchExams();
    } else {
      setExams([]);
      setSelectedExam('');
    }
    setReportData([]);
  }, [selectedBatch]);

  useEffect(() => {
    setReportData([]);
  }, [selectedExam]);

  const fetchExams = async () => {
    try {
      const { data } = await supabase
        .from('exams')
        .select('*')
        .eq('batch_id', selectedBatch)
        .order('created_at', { ascending: false });
      setExams(data || []);
    } catch (err) {
      toast.error('Failed to load exams');
    }
  };

  const handleDownloadPDF = async () => {
    if (reportData.length === 0) return;
    
    if (isAggregateSelected) {
      handleDownloadIndividualPDFs();
      return;
    }

    setIsDownloading(true);
    const loadingToast = toast.loading('Preparing PDF report...');
    try {
      const batch = batches.find(b => b.id === selectedBatch);
      const exam = isAggregateSelected ? { exam_name: 'Aggregate' } : exams.find(e => e.id === selectedExam);
      
      if (!batch || (!isAggregateSelected && !exam)) {
        toast.error('Missing batch or exam information');
        return;
      }
      
      const colCode = batch.colleges?.college_code;
      const bCode = batch.batch_code;
      const displayBatchCode = colCode 
        ? (bCode.startsWith(`${colCode}-`) ? bCode : `${colCode}-${bCode}`)
        : bCode;
      
      await generateConsolidatedPDF({
        batchName: `${batch.class_name}_${displayBatchCode}`,
        examName: exam.exam_name
      });
      
      toast.success('PDF downloaded successfully', { id: loadingToast });
    } catch (err) {
      toast.error('Failed to generate PDF', { id: loadingToast });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintAllAnnual = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    setShowDownloadModal(true);
  };

  const handleDownloadIndividualPDFs = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    setIsBatchPrinting(true);
    const loadingToast = toast.loading('Validating marks for all students...');
    
    try {
      // 1. Fetch all data needed for validation
      const [
        { data: students },
        { data: subjects },
        { data: examsInBatch }
      ] = await Promise.all([
        supabase.from('students').select(`
          *,
          batches(id, class_name, batch_code, batch_year, college_id)
        `).eq('batch_id', selectedBatch).order('roll_number'),
        supabase.from('batch_subjects').select('subject_id').eq('batch_id', selectedBatch),
        supabase.from('exams').select('id, exam_name').eq('batch_id', selectedBatch)
      ]);

      if (!students || !subjects || !examsInBatch || examsInBatch.length === 0) {
        toast.error('Could not find enough data for this batch', { id: loadingToast });
        setIsBatchPrinting(false);
        return;
      }

      // 2. All marks filled! Generate the PDF.
      toast.loading('Generating all annual reports... this could take a few minutes.', { id: loadingToast });
      setBatchProgress({ current: 0, total: students.length });
      
      const batchObj = batches.find(b => b.id === selectedBatch);
      
      // Generate combined PDF for each student one by one
      for (const student of students) {
        const studentWithBatch = {
          ...student,
          college_id: (student.batches as any)?.college_id,
          batch_id: student.batch_id
        };
        await generateCombinedPDF({
          student: studentWithBatch,
          supabase,
          pdfSettings
        });
        // Small delay between each PDF to avoid browser freeze
        await new Promise(r => setTimeout(r, 500));
        setBatchProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }

      toast.success(`Generated ${students.length} aggregate PDFs`, { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate batch reports', { id: loadingToast });
    } finally {
      setIsBatchPrinting(false);
      setBatchProgress({ current: 0, total: 0 });
    }
  };

  const handleDownloadCombinedSinglePDF = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    setIsMergingPDF(true);
    const loadingToast = toast.loading('Generating combined single PDF...', { id: 'combined-pdf' });

    try {
      // Fetch all students in batch
      const { data: students } = await supabase
        .from('students')
        .select(`*, batches(id, class_name, batch_code, batch_year, college_id)`)
        .eq('batch_id', selectedBatch)
        .order('roll_number');

      if (!students || students.length === 0) {
        toast.error('No students found', { id: 'combined-pdf' });
        return;
      }

      // Import required libraries - Use dynamic imports if needed, but they are already imported or available via utils
      const ReactDOM = (await import('react-dom/client')).default;
      const React = (await import('react')).default;
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const CombinedResultPDF = (await import('../../components/PDF/CombinedResultPDF')).default;
      const { prepareCombinedPDFData } = (await import('../../utils/generateCombinedPDF'));

      // Create one jsPDF instance for all pages
      const isLandscape = pdfSettings?.aggregate_orientation === 'landscape';
      const widthPx = isLandscape ? 1123 : 794;
      const mergedPDF = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: 'a4' });
      let isFirstPage = true;

      toast.loading(`Processing ${students.length} students...`, { id: 'combined-pdf' });

      for (let idx = 0; idx < students.length; idx++) {
        const student = students[idx];
        toast.loading(`Processing ${idx + 1}/${students.length}: ${student.student_name}`, { id: 'combined-pdf' });

        // Fetch data for this student
        const pdfData = await prepareCombinedPDFData({
          student: { ...student, college_id: (student.batches as any)?.college_id },
          supabase
        });

        if (!pdfData) continue;

        // Render PDF component to DOM
        const container = document.createElement('div');
        container.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;`;
        document.body.appendChild(container);

        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(CombinedResultPDF, { ...pdfData, pdfSettings }));

        // Wait for render
        await new Promise(r => setTimeout(r, 400));

        // Wait for images
        const images = container.querySelectorAll('img');
        await Promise.all(Array.from(images).map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 5000);
          });
        }));

        await new Promise(r => setTimeout(r, 300));

        // Capture
        const element = container.firstChild as HTMLElement;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          width: widthPx,
          windowWidth: widthPx,
          logging: false,
          imageTimeout: 15000,
          onclone: (clonedDoc) => {
            const imgs = clonedDoc.querySelectorAll('img');
            imgs.forEach(img => { (img as any).crossOrigin = 'anonymous'; });
            const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
            links.forEach(link => link.remove());
            const styleEl = clonedDoc.createElement('style');
            styleEl.textContent = ':root { --tw-ring-color: rgba(59,130,246,0.5) !important; }';
            clonedDoc.head.appendChild(styleEl);
          }
        });

        // Cleanup
        root.unmount();
        document.body.removeChild(container);

        // Add to merged PDF
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = mergedPDF.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (!isFirstPage) {
          mergedPDF.addPage();
        }
        mergedPDF.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        isFirstPage = false;

        // Small delay between students
        await new Promise(r => setTimeout(r, 200));
      }

      // Download the merged PDF
      const batchName = (students[0]?.batches as any)?.batch_code || 'batch';
      mergedPDF.save(`Aggregate_Results_${batchName}_All_Students.pdf`);

      toast.success(`Combined PDF with ${students.length} students downloaded!`, { id: 'combined-pdf' });

    } catch (err) {
      console.error(err);
      toast.error('Failed to generate combined PDF', { id: 'combined-pdf' });
    } finally {
      setIsMergingPDF(false);
    }
  };

  const generateReport = async () => {
    if (!selectedBatch || !selectedExam) {
      toast.error('Please select both batch and exam');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get all students in batch
      // 2. Get all subjects in batch
      const [
        { data: students },
        { data: subjects },
      ] = await Promise.all([
        supabase.from('students').select('*').eq('batch_id', selectedBatch).order('roll_number'),
        supabase.from('batch_subjects').select('subject_id, subjects(subject_name, is_graded)').eq('batch_id', selectedBatch),
      ]);

      if (isAggregateSelected) {
        // AGGREGATE LOGIC
        const { data: examsInBatch } = await supabase
          .from('exams')
          .select('*')
          .eq('batch_id', selectedBatch)
          .order('created_at', { ascending: true });

        const formattedSubjectsList = (subjects || []).map((s: any) => {
          const subData = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
          return {
            id: s.subject_id,
            name: subData?.subject_name,
            group: subData?.subject_group,
            is_graded: subData?.is_graded || subData?.subject_name?.toLowerCase().includes('sport')
          };
        });

        const { data: results } = await supabase
          .from('results')
          .select('*')
          .in('exam_id', (examsInBatch || []).map(e => e.id));

        const formattedResults = (students || []).map(student => {
          const subjectAggregates: any = {};
          let totalObtained = 0;
          let totalOutOf = 0;
          
          let failCount = 0;
          const preferences = (student as any).subject_preferences || {};

          formattedSubjectsList.forEach(sub => {
            // Check if student takes this subject
            if (sub.group) {
              const preferredId = preferences[sub.group];
              if (preferredId) {
                let isSelected = false;
                if (Array.isArray(preferredId)) {
                  isSelected = preferredId.includes(sub.id);
                } else if (typeof preferredId === 'string') {
                  if (preferredId.includes(',')) {
                    isSelected = preferredId.split(',').map(s => s.trim()).includes(sub.id);
                  } else {
                    isSelected = preferredId === sub.id;
                  }
                }
                if (!isSelected) {
                  subjectAggregates[sub.id] = null; // Not taken
                  return;
                }
              }
            }

            let subObtained = 0;
            let subOutOf = 0;
            
            (examsInBatch || []).forEach(exam => {
              const res = (results || []).find(r => r.student_id === student.id && r.exam_id === exam.id && r.subject_id === sub.id);
              subObtained += (res ? res.gained_marks : 0);
              subOutOf += exam.out_of_marks;
            });

            // Calculate aggregate for this subject
            const subAggMarks = subObtained / 2;
            const subAggOutOf = subOutOf / 2;
            const subAggPct = subAggOutOf > 0 ? (subAggMarks / subAggOutOf) * 100 : 0;

            if (subAggPct < 35 && !sub.is_graded) {
              failCount++;
            }

            subjectAggregates[sub.id] = { 
              obtained: subObtained, 
              outOf: subOutOf, 
              aggMarks: subAggMarks, 
              aggOutOf: subAggOutOf,
              isGraded: sub.is_graded,
              grade: sub.is_graded ? 'PASS' : null // Simplified grade for report
            };

            if (!sub.is_graded) {
              totalObtained += subObtained;
              totalOutOf += subOutOf;
            }
          });

          const aggregateMarks = totalObtained / 2;
          const aggregateOutOf = totalOutOf / 2;

          return {
            id: student.id,
            name: student.student_name,
            roll: student.roll_number,
            pen_number: student.pen_number,
            exam_set_number: student.exam_set_number,
            subjectAggregates,
            subjectList: formattedSubjectsList,
            totalObtained,
            totalOutOf,
            aggregateMarks,
            aggregateOutOf,
            percentage: aggregateOutOf > 0 ? (aggregateMarks / aggregateOutOf) * 100 : 0,
            failCount
          };
        });

        setReportData(formattedResults);
      } else {
        // EXISTING SPECIFIC EXAM LOGIC
        const { data: results } = await supabase.from('results').select('*').eq('exam_id', selectedExam);
        const { data: examData } = await supabase.from('exams').select('out_of_marks').eq('id', selectedExam).single();
        const maxMarks = examData?.out_of_marks || 100;
        const passMarks = Math.ceil(maxMarks * 0.35);

          const formattedResults = (students || []).map(student => {
          const studentMarks: any = {};
          let totalGained = 0;
          
          const exam = exams?.find(e => e.id === selectedExam);
          const isAnnual = exam?.exam_name ? exam.exam_name.toLowerCase().includes('annual') : false;
          const preferences = (student as any).subject_preferences || {};

          const subjectsList = (subjects || []).map((s: any) => {
            const subData = (Array.isArray(s.subjects) ? s.subjects[0] : s.subjects) as any;
            return {
              id: s.subject_id,
              name: subData?.subject_name,
              group: subData?.subject_group,
              is_graded: subData?.is_graded || subData?.subject_name?.toLowerCase().includes('sport')
            };
          }).filter(s => {
            if (s.is_graded) return isAnnual;
            return true;
          });

          (subjects || []).forEach(sub => {
            const res = (results || []).find(r => r.student_id === student.id && r.subject_id === sub.subject_id);
            const subData = (Array.isArray(sub.subjects) ? sub.subjects[0] : sub.subjects) as any;
            
            const isAlternative = subData?.subject_group;
            if (isAlternative) {
              const pref = preferences[subData.subject_group];
              if (pref) {
                let isSelected = false;
                if (Array.isArray(pref)) {
                  isSelected = pref.includes(sub.subject_id);
                } else if (typeof pref === 'string') {
                  if (pref.includes(',')) {
                    isSelected = pref.split(',').map(s => s.trim()).includes(sub.subject_id);
                  } else {
                    isSelected = pref === sub.subject_id;
                  }
                }
                if (!isSelected) {
                  studentMarks[sub.subject_id] = '-'; // Explicitly not taken
                  return;
                }
              }
            }

            if (subData?.is_graded) {
              studentMarks[sub.subject_id] = res ? res.grade : (isAlternative ? '-' : null);
            } else {
              const gained = res ? res.gained_marks : 0;
              studentMarks[sub.subject_id] = res ? gained : (isAlternative ? '-' : null);
              if (res) totalGained += gained;
            }
          });

          // Only count non-graded subjects for total marks
          const nonGradedCount = subjectsList.filter(s => !s.is_graded).length;
          const studentTotalMaxMarks = nonGradedCount * maxMarks;

          return {
            id: student.id,
            name: student.student_name,
            roll: student.roll_number,
            pen_number: student.pen_number,
            exam_set_number: student.exam_set_number,
            marks: studentMarks,
            total: totalGained,
            percentage: studentTotalMaxMarks > 0 ? (totalGained / studentTotalMaxMarks) * 100 : 0,
            subjectList: subjectsList,
            maxMarksPerSubject: maxMarks,
            passingMarksPerSubject: passMarks,
            totalMaxMarks: studentTotalMaxMarks
          };
        });

        setReportData(formattedResults);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredData = reportData.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.roll.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Academic Performance Ledger">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Report Sheets</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2rem] mt-1">Institutional Academic Records</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button 
            onClick={handlePrintAllAnnual}
            disabled={!selectedBatch || isBatchPrinting}
            className="h-12 px-6 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isBatchPrinting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{batchProgress.total > 0 ? `${batchProgress.current}/${batchProgress.total}` : 'Processing...'}</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Print All Annuals</span>
              </>
            )}
          </button>
           <button 
            onClick={handleDownloadPDF}
            disabled={reportData.length === 0 || isDownloading}
            className="h-12 px-6 bg-primary-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            <span>Export Table</span>
          </button>
           <button 
            onClick={() => window.print()}
            disabled={reportData.length === 0}
            className="h-12 px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Printer size={16} />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {reportData.length > 0 && collegeData && !isAggregateSelected && (
          <ConsolidatedReportPDF 
            ref={null}
            college={collegeData}
            batch={{
              ...batches.find(b => b.id === selectedBatch),
              customClassName: className
            }}
            exam={exams.find(e => e.id === selectedExam)}
            reportData={reportData}
            classTeacherName={classTeacher}
            pdfSettings={pdfSettings}
          />
        )}
      </div>

      {/* Filters Bar */}
      <div className="card mb-8 shadow-sm print:hidden bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cohort Batch</label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="input-field pl-10 h-11 bg-slate-50 border-slate-100 text-sm font-bold appearance-none w-full"
              >
                <option value="">Choose Batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.class_name} ({b.colleges?.college_code 
                      ? (b.batch_code.startsWith(`${b.colleges.college_code}-`) 
                          ? b.batch_code 
                          : `${b.colleges.college_code}-${b.batch_code}`)
                      : b.batch_code})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assessment</label>
            <div className="relative">
              <ClipboardCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                disabled={!selectedBatch}
                className="input-field pl-10 h-11 bg-slate-50 border-slate-100 text-sm font-bold appearance-none w-full disabled:opacity-50"
              >
                <option value="">Choose Exam...</option>
                <option value="aggregate">📊 Aggregate Result</option>
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.exam_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Class Display</label>
            <input 
              type="text"
              placeholder="e.g. 12TH (A)"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="input-field h-11 bg-slate-50 border-slate-100 text-sm font-bold px-4 w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Class Teacher</label>
            <input 
              type="text"
              placeholder="Full Name"
              value={classTeacher}
              onChange={(e) => setClassTeacher(e.target.value)}
              className="input-field h-11 bg-slate-50 border-slate-100 text-sm font-bold px-4 w-full"
            />
          </div>

          <div className="col-span-2 md:col-span-4 flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-50 mt-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Locate student record..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 h-11 bg-slate-50 border-slate-100 text-sm font-bold w-full"
              />
            </div>
            <button 
              onClick={generateReport}
              className="btn-primary flex-1 sm:flex-none sm:min-w-[200px] h-11 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
            >
              <FileText size={16} />
              <span>Generate Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {showDownloadModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white rounded-[2rem] p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-green-500" />
            
            <h2 className="text-2xl font-black text-slate-800 mb-2">
              Download All Results
            </h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">
              Choose how you want to download the aggregate result cards for all students in this batch.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              
              {/* Option 1: Individual PDFs */}
              <button
                onClick={() => {
                  setShowDownloadModal(false);
                  handleDownloadIndividualPDFs();
                }}
                disabled={isBatchPrinting || isMergingPDF}
                className="group flex items-start gap-4 p-5 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <FileText className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Individual PDFs</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Download a separate PDF file for each student.
                    Files will download one by one automatically.
                  </p>
                </div>
              </button>

              {/* Option 2: Combined Single PDF */}
              <button
                onClick={() => {
                  setShowDownloadModal(false);
                  handleDownloadCombinedSinglePDF();
                }}
                disabled={isBatchPrinting || isMergingPDF}
                className="group flex items-start gap-4 p-5 border-2 border-slate-100 rounded-2xl hover:border-green-500 hover:bg-green-50/50 transition-all text-left"
              >
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <Download className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase tracking-tight">Combined Single PDF</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Merge all student result cards into one single PDF file.
                    Each student gets their own page.
                  </p>
                </div>
              </button>

            </div>

            <button
              onClick={() => setShowDownloadModal(false)}
              className="w-full py-4 bg-slate-50 text-slate-500 rounded-xl font-bold hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isMergingPDF && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white rounded-[3rem] p-12 text-center max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 animate-gradient-x" />
            
            <div className="relative mb-8 pt-4">
              <div className="w-24 h-24 border-8 border-slate-100 border-t-primary-600 rounded-full animate-spin mx-auto" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mb-4 bg-white p-2 rounded-full">
                <FileDown className="text-primary-600 animate-bounce" size={32} />
              </div>
            </div>

            <p className="font-black text-slate-900 text-2xl tracking-tight mb-2">Compiling Master PDF</p>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
              Please wait while we merge all student aggregate results into a single document.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-2xl mb-2">
               <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Security Notice</p>
               <p className="text-slate-600 text-xs font-bold mt-1">Do not close or refresh this tab</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-primary-600" size={48} />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Compiling Report Sheet...</p>
        </div>
      ) : reportData.length > 0 ? (
        <div className="table-wrapper print:shadow-none print:border-none">
          <table className="data-table border-collapse min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="font-black uppercase tracking-widest border-r border-slate-800 w-20 text-center sticky left-0 z-10 bg-slate-900 px-4 py-4">Roll No</th>
                <th className="font-black uppercase tracking-widest border-r border-slate-800 min-w-[200px] sticky left-20 z-10 bg-slate-900 px-4 py-4">Student's Name</th>
                  {isAggregateSelected ? (
                    <>
                      {reportData[0]?.subjectList?.map((sub: any) => (
                        <th key={sub.id} style={{ minWidth: '90px' }} className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center text-[10px] break-words">
                          {sub.name} {sub.group ? '(ALT)' : ''}
                        </th>
                      ))}
                      <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-slate-800 w-28">
                        Total Obtained
                      </th>
                      <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-slate-800 w-28">
                        Total Out Of
                      </th>
                      <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-purple-900 w-28">
                        Agg. Marks
                      </th>
                      <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-purple-900 w-28">
                        Agg. Out Of
                      </th>
                    </>
                  ) : (
                    <>
                      {reportData[0]?.subjectList?.map((sub: any) => (
                        <th key={sub.id} style={{ minWidth: '90px' }} className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center text-[10px] break-words">
                          {sub.name}
                        </th>
                      ))}
                      <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-slate-800 w-28">
                        Obt. Marks
                      </th>
                    </>
                  )}
                  <th className="p-4 font-black uppercase tracking-widest border-r border-slate-800 text-center bg-slate-800 w-28">
                    {isAggregateSelected ? 'Agg. %' : 'Percentage'}
                  </th>
                  <th className="p-4 font-black uppercase tracking-widest text-center bg-slate-800">Remark</th>
                </tr>
                {/* "Out of" Row */}
                {reportData[0]?.subjectList && (
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-200">
                    <td className="p-2 text-center border-r border-slate-200" colSpan={2}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">Max Marks</span>
                    </td>
                    {reportData[0]?.subjectList?.map((sub: any) => (
                      <td key={sub.id} className="p-2 text-center font-black border-r border-slate-200 text-[10px]">
                        {isAggregateSelected 
                          ? (sub.is_graded ? 'GRD' : (reportData[0]?.subjectAggregates?.[sub.id]?.outOf || 200))
                          : (sub.is_graded ? 'GRD' : reportData[0]?.maxMarksPerSubject)
                        }
                      </td>
                    ))}
                    {isAggregateSelected ? (
                      <>
                        <td className="p-2 text-center font-black border-r border-slate-200 text-[10px] bg-slate-200">Total Sum</td>
                        <td className="p-2 text-center font-black border-r border-slate-200 text-[10px] bg-slate-200">Total Sum</td>
                        <td className="p-2 text-center font-black border-r border-slate-200 text-[10px] bg-purple-100">Agg Sum</td>
                        <td className="p-2 text-center font-black border-r border-slate-200 text-[10px] bg-purple-100">Agg Sum</td>
                      </>
                    ) : (
                      <td className="p-2 text-center font-black border-r border-slate-200 text-[10px]">
                        {reportData[0]?.totalMaxMarks}
                      </td>
                    )}
                    <td className="p-2 text-center font-black border-r border-slate-200 text-[10px]">100%</td>
                    <td className="p-2"></td>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.sort((a,b) => b.percentage - a.percentage).map((row) => {
                  if (isAggregateSelected) {
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-400 border-r border-slate-50 italic">
                          {row.roll}
                        </td>
                        <td className="p-4 border-r border-slate-50">
                          <p className="font-black text-slate-900 group-hover:text-purple-600 transition-colors uppercase">
                            {row.name}
                          </p>
                        </td>
                        {row.subjectList.map((sub: any) => {
                          const agg = row.subjectAggregates[sub.id];
                          if (agg === null) {
                             return <td key={sub.id} className="p-4 text-center border-r border-slate-50 font-bold text-slate-300">-</td>;
                          }
                          return (
                            <td key={sub.id} className="p-4 text-center border-r border-slate-50 font-bold text-slate-600">
                              {sub.is_graded ? 'PASS' : agg.obtained}
                            </td>
                          );
                        })}
                        <td className="p-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">
                          {row.totalObtained}
                        </td>
                        <td className="p-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">
                          {row.totalOutOf}
                        </td>
                        <td className="p-4 text-center border-r border-slate-50 font-black text-purple-600 bg-purple-50/30">
                          {row.aggregateMarks}
                        </td>
                        <td className="p-4 text-center border-r border-slate-50 font-black text-purple-600 bg-purple-50/30">
                          {row.aggregateOutOf}
                        </td>
                        <td className="p-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">
                          {row.percentage.toFixed(2)}%
                        </td>
                        <td className="p-4 text-center">
                          {row.failCount === 0 && row.percentage >= 35 ? (
                            <span className="font-black text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">
                              PASS
                            </span>
                          ) : (
                            <span className="font-black text-red-600 tracking-widest bg-red-50 px-3 py-1 rounded-lg italic text-xs">
                              FAIL {row.failCount > 0 ? `(${row.failCount})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  const subPassMarks = row.passingMarksPerSubject;
                  let failCount = 0;
                  
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-center font-bold text-slate-400 border-r border-slate-50 italic">
                        {row.roll}
                      </td>
                      <td className="p-4 border-r border-slate-50">
                        <p className="font-black text-slate-900 group-hover:text-purple-600 transition-colors uppercase">
                          {row.name}
                        </p>
                      </td>
                      {row.subjectList.map((sub: any) => {
                        const markOrGrade = row.marks[sub.id];
                        const isGraded = sub.is_graded;
                        
                        let isFail = false;
                        if (!isGraded) {
                          isFail = markOrGrade === null || markOrGrade === undefined || markOrGrade < subPassMarks;
                        } else {
                          isFail = markOrGrade === 'FAIL';
                        }
                        
                        if (isFail) failCount++;
                        return (
                      <td key={sub.id} className={`p-4 text-center border-r border-slate-50 font-bold ${isFail ? 'text-red-500' : 'text-slate-600'}`}>
                        {markOrGrade === '-' ? '-' : (markOrGrade !== null && markOrGrade !== undefined ? markOrGrade : 'ABSENT')}
                      </td>
                        );
                      })}
                      <td className="p-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">
                        {row.total}
                      </td>
                      <td className="p-4 text-center border-r border-slate-50 font-black text-slate-900 bg-slate-50/30">
                        {row.percentage.toFixed(2)}%
                      </td>
                      <td className="p-4 text-center">
                        {failCount > 0 ? (
                          <span className="font-black text-red-600 tracking-widest bg-red-50 px-3 py-1 rounded-lg italic">
                            F{failCount}
                          </span>
                        ) : row.percentage >= 35 ? (
                          <span className="font-black text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1 rounded-lg">
                            PASS
                          </span>
                        ) : (
                          <span className="font-black text-red-600 tracking-widest bg-red-50 px-3 py-1 rounded-lg italic text-xs">FAIL</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 py-24">
          <EmptyState 
            title="No Report Generated"
            description="Select a batch and an exam above and click 'Generate Sheet' to see the combined report card for the entire class."
            icon={<FileText size={48} className="text-slate-200" />}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default ResultReport;
