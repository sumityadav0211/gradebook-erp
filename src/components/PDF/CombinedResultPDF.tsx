import React, { forwardRef } from 'react';
import { mapToSubjectRows } from '../../utils/studentDataMapper';

interface Exam {
  id: string;
  exam_name: string;
  out_of_marks: number;
}

interface SubjectRow {
  subject_name: string;
  subject_group?: string | null;
  marks: {
    [exam_id: string]: {
      gained: number;
      outOf: number;
      grade?: string;
    };
  };
  totalObtained: number;
  totalOutOf: number;
  aggregateMarks: number;
  aggregateOutOf: number;
  percentage: number;
  grade: string;
  is_graded?: boolean;
}

interface CombinedResultPDFProps {
  student: {
    student_name: string;
    roll_number: string;
    batch_id: string;
    mother_name?: string;
    motherName?: string;
    reg_number?: string;
    registration_number?: string;
    registrationNumber?: string;
    pen_number?: string;
    seat_number?: string;
    exam_set_number?: string;
    batches?: {
      class_name: string;
      batch_code: string;
      batch_year: number;
      colleges?: {
        college_code: string;
      };
    };
  };
  college: {
    id: string;
    college_name: string;
    college_code: string;
    slogan?: string;
    sub_slogan?: string;
    address?: string;
    institute_name?: string;
    registration_number?: string;
    logo_url?: string;
    portrait_url?: string;
  };
  batch: {
    batch_year: number;
    class_name?: string;
    batch_code?: string;
  };
  // NEW Prop pattern (from generateCombinedPDF.ts)
  allExams?: Exam[];
  subjectRows?: SubjectRow[];
  grandAggregateMarks?: number;
  grandAggregateOutOf?: number;
  aggregatePct?: string;
  isPassed?: boolean;
  failingCells?: Record<string, boolean>;
  pdfSettings?: any;

  // OLD Prop pattern (from legacy pages)
  exams?: Exam[];
  subjects?: any[];
  marksData?: any;
}

const CombinedResultPDF = forwardRef<HTMLDivElement, CombinedResultPDFProps>(({ 
  student, 
  college, 
  batch, 
  allExams = [], 
  subjectRows: initialSubjectRows = [],
  grandAggregateMarks: propGrandMarks,
  grandAggregateOutOf: propGrandOutOf,
  aggregatePct: propAggPct,
  isPassed,
  failingCells = {},
  pdfSettings,
  // Legacy support
  exams: legacyExams,
  subjects: legacySubjects,
  marksData: legacyMarksData
}, ref) => {
  const passPercentage = 35; 

  // RESOLVE SUBJECT ROWS
  let subjectRows = [...(initialSubjectRows && initialSubjectRows.length > 0 ? initialSubjectRows : [])];
  
  // Sort subjectRows: Graded subjects always last
  subjectRows.sort((a, b) => (a.is_graded === b.is_graded ? 0 : a.is_graded ? 1 : -1));
  
  if (subjectRows.length === 0 && legacySubjects && legacyExams && legacyMarksData) {
    // Re-map using mapper if not provided
    const subjectsToMap = legacySubjects.map(s => ({ 
      id: s.id, 
      subject_name: s.subject_name,
      is_graded: s.is_graded
    }));
    
    // Ensure marks data includes grades
    const enrichedMarksData: any = {};
    Object.entries(legacyMarksData).forEach(([subId, marks]) => {
      enrichedMarksData[subId] = marks;
    });

    const mapped = mapToSubjectRows(subjectsToMap, legacyExams, enrichedMarksData);
    subjectRows = mapped.map(r => ({
      ...r,
      aggregateMarks: r.is_graded ? 0 : (r.totalGained / 2),
      aggregateOutOf: r.is_graded ? 0 : (r.totalOutOf / 2),
      totalObtained: r.is_graded ? 0 : r.totalGained
    })) as SubjectRow[];
  }

  const getValidNumber = (val: any) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const grandAggregateMarks = propGrandMarks !== undefined 
    ? getValidNumber(propGrandMarks) 
    : subjectRows.reduce((s: number, r: any) => {
        if (r.is_graded) return s;
        const marks = r.aggregateMarks !== undefined ? r.aggregateMarks :
                     r.totalGained !== undefined ? r.totalGained / 2 :
                     r.totalObtained !== undefined ? r.totalObtained / 2 : 0;
        return s + getValidNumber(marks);
      }, 0);

  const grandAggregateOutOf = propGrandOutOf !== undefined 
    ? getValidNumber(propGrandOutOf) 
    : subjectRows.reduce((s: number, r: any) => {
        if (r.is_graded) return s;
        const outOf = r.aggregateOutOf !== undefined ? r.aggregateOutOf :
                     r.totalOutOf !== undefined ? r.totalOutOf / 2 : 0;
        return s + getValidNumber(outOf);
      }, 0);

  const aggregatePct = propAggPct !== undefined 
    ? propAggPct 
    : (grandAggregateOutOf > 0 
        ? (getValidNumber(grandAggregateMarks) / getValidNumber(grandAggregateOutOf) * 100).toFixed(2) 
        : '0.00');

  const finalIsPassed = isPassed !== undefined
    ? isPassed
    : subjectRows.every((r: any) => {
        if (r.is_graded) return r.grade !== 'FAIL' && r.grade !== 'E';
        return r.percentage >= passPercentage;
      });

  const overallGrade =
    parseFloat(aggregatePct) >= 90 ? 'A+' :
    parseFloat(aggregatePct) >= 75 ? 'A' :
    parseFloat(aggregatePct) >= 60 ? 'B' :
    parseFloat(aggregatePct) >= 45 ? 'C' :
    parseFloat(aggregatePct) >= 35 ? 'D' : 'F';

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const isLandscape = pdfSettings?.aggregate_orientation === 'landscape';
  const pdfWidth = isLandscape ? '297mm' : '210mm';
  const pdfHeight = isLandscape ? '210mm' : '297mm';

  return (
    <div 
      ref={ref}
      style={{
        width: pdfWidth,
        height: pdfHeight,
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: '15mm',
        boxSizing: 'border-box',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        margin: '0 auto'
      }}
    >
      {/* SECTION 1 - HEADER */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px', alignItems: 'center', marginBottom: '8px' }}>
        {/* Left Logo */}
        <div style={{ textAlign: 'left' }}>
          {college?.logo_url ? (
            <img 
              src={college.logo_url} 
              alt="Logo" 
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{ width: '120px', height: '120px', backgroundColor: '#f3f4f6', borderRadius: '8px' }} />
          )}
        </div>

        {/* Center Text */}
        <div style={{ textAlign: 'center' }}>
           <p style={{ 
             fontSize: '10px', 
             fontStyle: 'italic', 
             margin: '0 0 2px 0', 
             fontWeight: 'bold', 
             color: '#000',
             lineHeight: '1.2'
           }}>
             "{ college?.slogan || 'ज्ञानविज्ञान आणि सुसंस्कार यासाठी शिक्षण प्रसार' }"
           </p>
           <p style={{ 
             fontSize: '10px', 
             margin: '0 0 4px 0', 
             fontWeight: 'bold', 
             color: '#444',
             lineHeight: '1.2'
           }}>
             {college?.sub_slogan || 'शिक्षणमहर्षी डॉ. बापूजी साळुंके'}
           </p>
           {college?.institute_name && (
             <p style={{
               fontSize: '10px',
               margin: '0 0 4px 0',
               fontWeight: 'bold',
               color: '#3b82f6',
               textTransform: 'uppercase',
               letterSpacing: '1px'
             }}>
               {college.institute_name}
             </p>
           )}
           <h1 style={{ 
             fontSize: '20px', 
             fontWeight: '900', 
             margin: '4px 0', 
             textTransform: 'uppercase', 
             color: '#1e3a8a', 
             letterSpacing: '0.5px',
             lineHeight: '1.1'
           }}>
             {college?.college_name?.toUpperCase()}
           </h1>
           {college?.address && (
             <p style={{ fontSize: '10px', color: '#444', margin: '4px 0 0 0', fontWeight: 'bold' }}>
               {college.address}
             </p>
           )}
           {college?.registration_number && pdfSettings?.show_college_reg_no !== false && (
             <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0', fontWeight: 'bold' }}>
               REG NO: {college.registration_number}
             </p>
           )}
        </div>

        {/* Right Portrait */}
        <div style={{ textAlign: 'right' }}>
          {college?.portrait_url ? (
            <img 
              src={college.portrait_url} 
              alt="Founder" 
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
              crossOrigin="anonymous"
            />
          ) : (
            <div style={{ width: '120px', height: '120px', backgroundColor: '#f3f4f6', borderRadius: '8px' }} />
          )}
        </div>
      </div>

      {/* Blue Separator Line */}
      <div style={{ width: '100%', borderBottom: '2px solid #1e3a8a', marginBottom: '4px' }}></div>
      <div style={{ width: '100%', borderBottom: '1px solid #1e3a8a', marginBottom: '16px' }}></div>


      {/* SECTION 2 - REPORT TITLE ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0', color: '#111827' }}>
            {pdfSettings?.result_card_subtitle || 'AGGREGATE PROGRESS REPORT CARD'}
          </h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Academic Year: {batch?.batch_year}-{parseInt(batch?.batch_year) + 1}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', margin: '0' }}>
            CLASS: {(batch?.class_name || '').toUpperCase()}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', marginTop: '4px' }}>
            {pdfSettings?.show_roll_no !== false && (
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#6b7280', margin: '0' }}>
                ROLL NO: {student?.roll_number}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3 - STUDENT INFO */}
      <div style={{
        backgroundColor: '#f0f4ff',
        border: '1px solid #c7d2fe',
        borderRadius: '4px',
        padding: '10px 16px',
        marginBottom: '16px'
      }}>
        {/* Row 1: Student Name Centered */}
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NAME OF STUDENT: </span>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', textTransform: 'uppercase' }}>{student.student_name}</span>
        </div>

        {/* Row 2 & 3: Info Rows */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Left Column Stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Mother's Name */}
            {(student.mother_name || student.motherName) && pdfSettings?.show_mother_name !== false && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MOTHER'S NAME:</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '0', textTransform: 'uppercase' }}>{student.mother_name || student.motherName}</p>
              </div>
            )}
            {/* SET NO */}
            {(student.seat_number || student.exam_set_number) && pdfSettings?.show_exam_seat_no !== false && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SET NO:</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '0' }}>{student.seat_number || student.exam_set_number}</p>
              </div>
            )}
          </div>

          {/* Right Column Stacked */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
            {/* PEN NO */}
            {(student.pen_number) && pdfSettings?.show_pen_no !== false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PEN NO:</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '0' }}>{student.pen_number}</p>
              </div>
            )}
            {/* REG NO */}
            {(student.reg_number || student.registration_number || student.registrationNumber) && pdfSettings?.show_reg_no !== false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>REG NO:</p>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#111827', margin: '0' }}>{student.reg_number || student.registration_number || student.registrationNumber}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4 - HORIZONTAL MARKS TABLE */}
      <div style={{ border: '2px solid #374151', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '11px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
              <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'left', minWidth: '80px' }}>SUBJECT</th>
              {subjectRows.map((row: any, i: number) => (
                <th key={i} style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', minWidth: '55px', textTransform: 'uppercase' }}>
                  {row.subject_name.replace(/\(ALT\)/gi, '').replace(/ALT/gi, '').trim().toUpperCase()}
                </th>
              ))}
              <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', minWidth: '70px' }}>TOTAL MARKS</th>
              <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', minWidth: '50px' }}>%</th>
              <th style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', minWidth: '60px' }}>REMARK</th>
            </tr>
          </thead>
          <tbody>
            {/* Row 2: OUT OF */}
            <tr style={{ backgroundColor: '#f1f5f9' }}>
              <td style={{ padding: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>OUT OF</td>
              {subjectRows.map((row: any, i: number) => (
                <td key={i} style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>
                  {row.is_graded ? 'GRADE' : String(getValidNumber(
                    row.aggregateOutOf !== undefined ? row.aggregateOutOf :
                    row.totalOutOf !== undefined ? row.totalOutOf / 2 : 0
                  ))}
                </td>
              ))}
              <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>
                {String(getValidNumber(grandAggregateOutOf))}
              </td>
              <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center' }}>-</td>
            </tr>
            {/* Row 3: MARKS */}
            <tr style={{ backgroundColor: '#ffffff' }}>
              <td style={{ padding: '8px', border: '1px solid #d1d5db', fontWeight: 'bold' }}>MARKS</td>
              {subjectRows.map((row: any, i: number) => {
                const subjectFail = row.is_graded 
                  ? (row.grade === 'FAIL' || row.grade === 'E' || row.grade === 'F' || !row.grade || row.grade === 'N/A') 
                  : (row.percentage < (passPercentage || 35));
                return (
                  <td key={i} style={{ 
                    padding: '8px', 
                    border: '1px solid #d1d5db', 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: subjectFail ? '#dc2626' : '#111827',
                    backgroundColor: subjectFail ? '#fff1f2' : 'transparent'
                  }}>
                    {row.is_graded ? (row.grade === 'N/A' || !row.grade ? '-' : row.grade) : String(getValidNumber(
                      row.aggregateMarks !== undefined ? row.aggregateMarks :
                      row.totalGained !== undefined ? row.totalGained / 2 :
                      row.totalObtained !== undefined ? row.totalObtained / 2 : 0
                    ))}
                  </td>
                );
              })}
              <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>
                {String(getValidNumber(grandAggregateMarks))}
              </td>
              <td style={{ padding: '8px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 'bold' }}>
                {aggregatePct}%
              </td>
              <td style={{ 
                padding: '8px', 
                border: '1px solid #d1d5db', 
                textAlign: 'center', 
                fontWeight: 'bold',
                color: finalIsPassed ? '#16a34a' : '#dc2626'
              }}>
                {finalIsPassed ? 'PASS' : 'FAIL'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NOTE SECTION */}
      {(pdfSettings?.show_note && pdfSettings?.note_text) && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 14px',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          backgroundColor: '#fafafa'
        }}>
          <p style={{
            fontSize: '11px',
            color: '#374151',
            margin: '0',
            fontStyle: 'italic'
          }}>
            <span style={{ fontWeight: 'bold' }}>Note : </span>
            {pdfSettings.note_text}
          </p>
          {pdfSettings?.show_date_field && pdfSettings?.date_text && (
            <p style={{
              fontSize: '11px',
              color: '#374151',
              margin: '6px 0 0 0',
              fontStyle: 'italic'
            }}>
              <span style={{ fontWeight: 'bold' }}>Date : </span>
              {pdfSettings.date_text}
            </p>
          )}
        </div>
      )}

      {/* SECTION 6 - SIGNATURE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '20px' }}>
        <div style={{ width: '150px', textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{pdfSettings?.signature_left || 'Class Teacher'}</p>
          </div>
        </div>
        <div style={{ width: '150px', textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{pdfSettings?.signature_center_label || 'H.O.D.'}</p>
          </div>
        </div>
        <div style={{ width: '150px', textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{pdfSettings?.signature_right || 'Principal Signature'}</p>
          </div>
        </div>
      </div>

      {/* SECTION 7 - FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px', borderTop: '1px solid #e5e7eb', paddingTop: '12px', color: '#9ca3af', fontSize: '10px' }}>
        <p style={{ margin: '0' }}>Generated on: {today}</p>
        <p style={{ margin: '0', fontWeight: 'bold', letterSpacing: '0.5px' }}>SCHOOL ERP MANAGEMENT SYSTEM</p>
      </div>
    </div>
  );
});

CombinedResultPDF.displayName = 'CombinedResultPDF';

export default CombinedResultPDF;
