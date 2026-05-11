import React, { useState } from 'react';
import { FileText, Trophy, Printer, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import PDFPreviewModal from './PDFPreviewModal';
import { usePDFGeneration } from '../../hooks/usePDFGeneration';
import { supabase } from '../../lib/supabase';

interface PDFActionButtonsProps {
  student: any;
  college: any;
  batch: any;
  exam?: any;
  examResults?: any[];
}

const PDFActionButtons: React.FC<PDFActionButtonsProps> = ({
  student,
  college,
  batch,
  exam,
  examResults
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [annualData, setAnnualData] = useState<any>(null);
  const [isLoadingAnnual, setIsLoadingAnnual] = useState(false);
  
  const { generateExam, generateCombined, isGenerating } = usePDFGeneration();

  const loadAnnualData = async () => {
    if (annualData) return;
    setIsLoadingAnnual(true);
    try {
      const { data: examsData } = await supabase.from('exams').select('*').eq('batch_id', batch.id).order('created_at', { ascending: true });
      const { data: batchSubjectsData } = await supabase.from('batch_subjects').select('subjects(id, subject_name, subject_code, subject_group, is_graded)').eq('batch_id', batch.id);
      const allResultsData = (await supabase.from('results').select('*, exams(*)').eq('student_id', student.id)).data;
      const { data: pdfSett } = await supabase.from('pdf_settings').select('*').eq('college_id', college.id).single();

      if (!examsData) throw new Error('Exams not found');

      const allSubjects = (batchSubjectsData || []).map((bs: any) => {
        const sub = bs.subjects;
        return Array.isArray(sub) ? sub[0] : sub;
      }).filter(Boolean);

      const preferences = student.subject_preferences || {};
      const subjectsList = allSubjects.filter((sub: any) => {
        if (!sub.subject_group) return true;
        const preferredId = preferences[sub.subject_group];
        if (!preferredId) return true;
        return sub.id === preferredId;
      });

      const marksMap: any = {};
      (allResultsData || []).forEach((res: any) => {
        if (!marksMap[res.subject_id]) marksMap[res.subject_id] = {};
        marksMap[res.subject_id][res.exam_id] = {
          gained_marks: res.gained_marks,
          out_of_marks: res.exams.out_of_marks,
          grade: res.grade
        };
      });

      setAnnualData({
        exams: examsData,
        subjects: subjectsList,
        marksData: marksMap,
        pdfSettings: pdfSett
      });
    } catch (err: any) {
      toast.error('Failed to load annual report data');
    } finally {
      setIsLoadingAnnual(false);
    }
  };

  const handleOpenPreview = async () => {
    setIsPreviewOpen(true);
    loadAnnualData();
  };

  const handleDownload = async (type: 'exam' | 'annual') => {
    try {
      if (type === 'exam') {
        if (!exam || !examResults) throw new Error('Missing exam data');
        await generateExam({
          student,
          exam,
          results: examResults,
          college
        });
      } else {
        await generateCombined({
          student,
          college,
          batch
        });
      }
      toast.success('PDF downloaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Generation failed');
    }
  };

  const handleUpload = async (type: 'exam' | 'annual') => {
    // Current generate functions already upload to Supabase as part of the process
    // We'll reuse them and just notify the user about the cloud link
    try {
      const response = type === 'exam' 
        ? await generateExam({ student, exam, results: examResults, college })
        : await generateCombined({ student, college, batch });
      
      toast.success('Successfully archived to cloud storage');
      if (response) {
        window.open(response, '_blank');
      }
    } catch (err: any) {
      toast.error('Cloud upload failed');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleOpenPreview}
          className="flex items-center gap-3 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
        >
          <FileText size={20} />
          View Report Card
        </button>
        
        <button
          onClick={() => window.print()}
          className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all border border-slate-200"
          title="Print current page"
        >
          <Printer size={20} />
        </button>

        {(isGenerating || isLoadingAnnual) && (
          <div className="flex items-center gap-2 text-primary-600 font-bold ml-2">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-xs uppercase tracking-widest">Processing...</span>
          </div>
        )}
      </div>

      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        student={student}
        college={college}
        batch={batch}
        exam={exam}
        examResults={examResults}
        allExams={annualData?.exams}
        allMarksData={annualData?.marksData}
        allSubjects={annualData?.subjects}
        pdfSettings={annualData?.pdfSettings}
        onDownload={handleDownload}
        onUpload={handleUpload}
      />
    </>
  );
};

export default PDFActionButtons;
