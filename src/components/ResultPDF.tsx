import React, { forwardRef } from 'react';

interface ResultItem {
  subject_name: string;
  subject_code: string;
  gained_marks: number;
  out_of_marks: number;
  grade?: string;
  is_graded?: boolean;
}

interface ResultPDFProps {
  student: {
    student_name: string;
    roll_number: string;
    mother_name?: string;
    reg_number?: string;
    pen_number?: string;
    seat_number?: string;
    batches: {
      class_name: string;
      batch_code: string;
      batch_year: number;
      colleges?: {
        college_code: string;
      };
    };
  };
  exam: {
    exam_name: string;
    out_of_marks: number;
  };
  results: ResultItem[];
  college: {
    college_name: string;
    institute_name?: string;
    slogan?: string;
    sub_slogan?: string;
    address?: string;
    registration_number?: string;
  };
  pdfSettings?: any;
}

const ResultPDF = forwardRef<HTMLDivElement, ResultPDFProps>(({ student, exam, results, college, pdfSettings }, ref) => {
  const collegeName = college.college_name;
  const numericResults = results.filter(r => !r.is_graded);
  const totalGained = numericResults.reduce((acc, curr) => acc + curr.gained_marks, 0);
  const totalOut = numericResults.length * exam.out_of_marks;
  const percentage = totalOut > 0 ? (totalGained / totalOut) * 100 : 0;
  const isPass = percentage >= 35;

  const sortedResults = [...results].sort((a, b) => (!!a.is_graded === !!b.is_graded ? 0 : a.is_graded ? 1 : -1));

  return (
    <div 
      ref={ref} 
      id="result-pdf-template"
      style={{ 
        width: '794px', // A4 width at 96 DPI
        padding: '40px',
        background: 'white',
        position: 'absolute',
        left: '-9999px',
        top: '0',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px', borderBottom: '2px solid #0f172a', paddingBottom: '20px' }}>
        {college.slogan && college.slogan.trim() && (
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', fontWeight: '800', color: '#111827', fontStyle: 'italic' }}>
            "{college.slogan.trim()}"
          </p>
        )}
        {college.sub_slogan && college.sub_slogan.trim() && (
          <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: '700', color: '#334155' }}>
            {college.sub_slogan.trim()}
          </p>
        )}
        {college.institute_name && college.institute_name.trim() && (
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {college.institute_name.trim()}
          </p>
        )}
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>{collegeName}</h1>
        {college.address && (
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>
            {college.address}
          </p>
        )}
        {college.registration_number && (
          <p style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8' }}>
            REG NO: {college.registration_number}
          </p>
        )}
        <p style={{ margin: '0', fontSize: '14px', fontWeight: '700', color: '#64748b', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Official Statement of Results
        </p>
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Scholar Information</p>
          <p style={{ margin: '0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{student.student_name}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Roll Number: {student.roll_number}</p>
          {student.mother_name && pdfSettings?.show_mother_name !== false && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Mother: {student.mother_name}</p>
          )}
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'right' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Academic Context</p>
          <p style={{ margin: '0', fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>{exam.exam_name}</p>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
            Batch: {student.batches?.colleges?.college_code 
              ? (student.batches.batch_code.startsWith(`${student.batches.colleges.college_code}-`) 
                  ? student.batches.batch_code 
                  : `${student.batches.colleges.college_code}-${student.batches.batch_code}`)
              : student.batches?.batch_code} (Class {student.batches?.class_name})
          </p>
          {(student.reg_number) && pdfSettings?.show_reg_no !== false && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Reg No: {student.reg_number}</p>
          )}
          {(student.seat_number) && pdfSettings?.show_exam_seat_no !== false && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', fontWeight: '600', color: '#64748b' }}>Seat No: {student.seat_number}</p>
          )}
        </div>
      </div>

      {/* Marks Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '40px' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f172a' }}>
            <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'white', textTransform: 'uppercase' }}>Subject</th>
            <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'white', textTransform: 'uppercase' }}>Subject Code</th>
            <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'white', textTransform: 'uppercase' }}>Obtained</th>
            <th style={{ padding: '12px 15px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'white', textTransform: 'uppercase' }}>Maximum</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.filter(r => !r.is_graded || (exam?.exam_name?.toLowerCase().includes('annual'))).map((res, index) => (
            <tr key={res.subject_code} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: index % 2 === 0 ? 'white' : '#f8fafc' }}>
              <td style={{ padding: '12px 15px', fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                {res.subject_name.replace(/\(ALT\)/gi, '').replace(/ALT/gi, '').trim().toUpperCase()}
                {res.is_graded && <span style={{ fontSize: '9px', marginLeft: '8px', color: '#8b5cf6', fontWeight: 'bold' }}>(GRADE BASED)</span>}
              </td>
              <td style={{ padding: '12px 15px', fontSize: '12px', fontWeight: '600', color: '#64748b', textAlign: 'center', fontFamily: 'monospace' }}>{res.subject_code}</td>
              <td style={{ padding: '12px 15px', fontSize: '16px', fontWeight: '800', color: res.is_graded ? '#8b5cf6' : '#0f172a', textAlign: 'center' }}>
                {res.is_graded ? (res.grade || '-') : res.gained_marks}
              </td>
              <td style={{ padding: '12px 15px', fontSize: '14px', fontWeight: '600', color: '#94a3b8', textAlign: 'center' }}>
                {res.is_graded ? '-' : res.out_of_marks}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <td colSpan={2} style={{ padding: '15px', fontSize: '14px', fontWeight: '900', color: '#0f172a', textAlign: 'right', textTransform: 'uppercase' }}>Aggregate Score</td>
            <td style={{ padding: '15px', fontSize: '20px', fontWeight: '900', color: '#0f172a', textAlign: 'center' }}>{totalGained}</td>
            <td style={{ padding: '15px', fontSize: '16px', fontWeight: '700', color: '#64748b', textAlign: 'center' }}>{totalOut}</td>
          </tr>
        </tfoot>
      </table>

      {/* Result Status */}
      <div style={{ border: '2px solid #0f172a', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, padding: '15px 20px', borderRight: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Percentage Obtained</p>
            <p style={{ margin: '0', fontSize: '24px', fontWeight: '900', color: isPass ? '#10b981' : '#ef4444' }}>{percentage.toFixed(1)}%</p>
          </div>
          <div style={{ 
            flex: 1,
            padding: '15px 20px', 
            backgroundColor: isPass ? '#f0fdf4' : '#fef2f2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <p style={{ margin: '0', fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Final Result</p>
            <p style={{ margin: '0', fontSize: '24px', fontWeight: '900', color: isPass ? '#15803d' : '#b91c1c', textTransform: 'uppercase', letterSpacing: '2px' }}>
              {isPass ? 'PASSED' : 'FAILED'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '80px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
        <p style={{ margin: '0', fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Generated by School ERP Management System • {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
});

ResultPDF.displayName = 'ResultPDF';

export default ResultPDF;
