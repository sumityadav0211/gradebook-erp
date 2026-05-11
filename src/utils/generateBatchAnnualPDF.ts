import React from 'react';
import ReactDOM from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import CombinedResultPDF from '../components/PDF/CombinedResultPDF';

interface GenerateBatchProps {
  students: any[];
  college: any;
  batch: any;
  supabase: any;
  pdfSettings?: any;
  onProgress?: (current: number, total: number) => void;
}

export default async function generateBatchAnnualPDF({ 
  students, 
  college, 
  batch, 
  supabase,
  pdfSettings,
  onProgress 
}: GenerateBatchProps) {
  try {
    // 1. Fetch exams for the batch
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select('*')
      .eq('batch_id', batch.id)
      .order('created_at');
    
    if (examsError) throw examsError;
    
    // 2. Fetch batch subjects
    const { data: batchSubjects, error: subjectsError } = await supabase
      .from('batch_subjects')
      .select('subjects(id, subject_name, is_graded)')
      .eq('batch_id', batch.id);

    if (subjectsError) throw subjectsError;

    // 3. Fetch all results for the whole batch for efficiency
    const studentIds = students.map(s => s.id);
    const { data: allResults, error: resultsError } = await supabase
      .from('results')
      .select('*, exams(out_of_marks)')
      .in('student_id', studentIds);

    if (resultsError) throw resultsError;

    // 4. Initialize jsPDF
    const isLandscape = pdfSettings?.aggregate_orientation === 'landscape';
    const widthPx = isLandscape ? 1123 : 794;
    const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    
    // 5. Create a hidden container for rendering
    const container = document.createElement('div');
    container.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;`;
    document.body.appendChild(container);

    // 6. Loop through each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      if (onProgress) onProgress(i + 1, students.length);

      const studentResults = (allResults || []).filter(r => r.student_id === student.id);
      
      // Calculate subject rows for this student
      const subjectRows = (batchSubjects || []).map((bs: any) => {
        const subject = bs.subjects;
        const isGraded = subject.is_graded;
        const marks: { [key: string]: { gained: number; outOf: number; grade?: string } } = {};
        let totalGained = 0;
        let totalOutOf = 0;
        let lastGrade = '';

        (exams || []).forEach((exam: any) => {
          const matchingResult = studentResults.find((r: any) => r.exam_id === exam.id && r.subject_id === subject.id);
          if (matchingResult) {
            marks[exam.id] = { 
              gained: matchingResult.gained_marks, 
              outOf: matchingResult.exams?.out_of_marks || exam.out_of_marks || 0,
              grade: matchingResult.grade
            };
            if (!isGraded) {
              totalGained += matchingResult.gained_marks;
              totalOutOf += matchingResult.exams?.out_of_marks || exam.out_of_marks || 0;
            } else {
              lastGrade = matchingResult.grade || lastGrade;
            }
          } else {
            if (!isGraded) {
              totalOutOf += Number(exam.out_of_marks || 0);
            }
            marks[exam.id] = { gained: 0, outOf: exam.out_of_marks };
          }
        });

        // Apply half-sum logic: (test 1 + mid term + test + annual) / 2
        const finalTotalGained = isGraded ? 0 : totalGained / 2;
        const finalTotalOutOf = isGraded ? 0 : totalOutOf / 2;

        const percentage = !isGraded && finalTotalOutOf > 0 ? (finalTotalGained / finalTotalOutOf) * 100 : 0;
        const getGrade = (pct: number) => {
            if (isGraded) return lastGrade || '-';
            if (pct >= 90) return 'A+';
            if (pct >= 75) return 'A';
            if (pct >= 60) return 'B';
            if (pct >= 45) return 'C';
            if (pct >= 35) return 'D';
            return 'F';
        };

        return {
          subject_name: subject.subject_name.toUpperCase(),
          marks,
          totalGained: finalTotalGained,
          totalOutOf: finalTotalOutOf,
          percentage,
          grade: getGrade(percentage),
          is_graded: isGraded
        };
      });

      // Calculate isPassed and failingCells for batch
      let isPassed = true;
      const failingCells: Record<string, boolean> = {};

      for (const row of subjectRows) {
        if (row.is_graded) {
          if (row.grade === 'FAIL' || row.grade === 'E') isPassed = false;
        } else {
          if (row.percentage < 35) {
            isPassed = false;
            failingCells[`${row.subject_name}_AGG`] = true;
          }
        }
      }

      // Render the component
      const rootDiv = document.createElement('div');
      container.innerHTML = '';
      container.appendChild(rootDiv);
      const root = ReactDOM.createRoot(rootDiv);
      
      root.render(
        React.createElement(CombinedResultPDF, {
          student, 
          college, 
          batch,
          allExams: exams || [],
          subjectRows,
          isPassed,
          failingCells,
          pdfSettings
        })
      );

      // Wait for render
      await new Promise(r => setTimeout(r, 600));

      // Capture
      const element = rootDiv.firstChild as HTMLElement;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: widthPx,
        windowWidth: widthPx,
        logging: false,
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.querySelectorAll('style');
          styleTags.forEach(tag => {
            if (tag.innerHTML.includes('oklch')) {
              tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
            }
          });
          const elementsWithStyle = clonedDoc.querySelectorAll('[style*="oklch"]');
          elementsWithStyle.forEach(el => {
            const style = el.getAttribute('style');
            if (style) {
              el.setAttribute('style', style.replace(/oklch\([^)]+\)/g, '#000000'));
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pageHeight = (canvas.height * pdfWidth) / canvas.width;
      
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pageHeight);
      
      root.unmount();
    }

    // 7. Cleanup
    document.body.removeChild(container);

    // 8. Save
    const fileName = `Batch_${batch.class_name}_Aggregate_Results.pdf`;
    pdf.save(fileName);

    return true;

  } catch (error: any) {
    console.error('Batch Annual PDF Error:', error);
    throw error;
  }
}
