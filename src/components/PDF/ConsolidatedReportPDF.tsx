import React, { forwardRef, useState, useEffect } from 'react';

interface ConsolidatedReportPDFProps {
  college: {
    college_name: string;
    college_code: string;
    logo_url?: string;
    portrait_url?: string;
    slogan?: string;
    sub_slogan?: string;
    institute_name?: string;
    address?: string;
    registration_number?: string;
  };
  batch: {
    class_name: string;
    batch_code: string;
    batch_year: number;
    customClassName?: string;
    colleges?: {
      college_code: string;
    };
  };
  exam: {
    exam_name: string;
  };
  reportData: any[];
  classTeacherName?: string;
  pdfSettings?: any;
}

const ConsolidatedReportPDF = forwardRef<HTMLDivElement, ConsolidatedReportPDFProps>(({ 
  college, 
  batch, 
  exam, 
  reportData,
  classTeacherName,
  pdfSettings
}, ref) => {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [portraitBase64, setPortraitBase64] = useState<string>('');

  useEffect(() => {
    const loadImages = async () => {
      try {
        const fetchAsBase64 = async (url: string) => {
          if (!url) return '';
          try {
            const res = await fetch(url);
            if (!res.ok) return '';
            const blob = await res.blob();
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.error('Fetch error:', e);
            return '';
          }
        };

        // Load Logo
        if (college.logo_url) {
          const b64 = await fetchAsBase64(college.logo_url);
          setLogoBase64(b64);
        } else {
          // Fallback to legacy path if no DB URL
          const b64 = await fetchAsBase64('/input_file_6.png') || await fetchAsBase64('/input_file_2.png');
          setLogoBase64(b64);
        }

        // Load Portrait (Dr. Bapuji Salunkhe)
        if (college.portrait_url) {
          const b64 = await fetchAsBase64(college.portrait_url);
          setPortraitBase64(b64);
        } else {
          // Fallback to legacy path
          const b64 = await fetchAsBase64('/input_file_5.png') || await fetchAsBase64('/input_file_3.png') || await fetchAsBase64('/input_file_4.png');
          setPortraitBase64(b64);
        }
      } catch (err) {
        console.error('Error loading PDF images:', err);
      }
    };
    loadImages();
  }, [college.logo_url, college.portrait_url]);

  if (!reportData || reportData.length === 0 || !reportData[0].subjectList) return null;

  const subjectList = reportData[0].subjectList;
  const maxMarksPerSubject = reportData[0].maxMarksPerSubject;
  const passingMarksPerSubject = reportData[0].passingMarksPerSubject || Math.ceil(maxMarksPerSubject * 0.35);
  const totalMaxMarks = reportData[0].totalMaxMarks;

  // Calculate Summary Statistics for Summary Table
  const summary: any = {
    PASS: Array((subjectList || []).length).fill(0),
    FAIL: Array((subjectList || []).length).fill(0),
    ABSENT: Array((subjectList || []).length).fill(0),
    NSOFF: Array((subjectList || []).length).fill(0)
  };

  reportData.forEach(student => {
    (subjectList || []).forEach((sub: any, idx: number) => {
      const marksOrGrade = student.marks[sub.id];
      const isGraded = sub.is_graded;
      
      const passingMark = student.passingMarksPerSubject || passingMarksPerSubject;
      
      if (marksOrGrade === undefined || marksOrGrade === null) {
        summary.ABSENT[idx]++;
        summary.FAIL[idx]++; // Absent is also a fail in summary
      } else if (isGraded) {
        if (marksOrGrade === 'FAIL') {
          summary.FAIL[idx]++;
        } else {
          summary.PASS[idx]++;
        }
      } else if (marksOrGrade < passingMark) {
        summary.FAIL[idx]++;
      } else {
        summary.PASS[idx]++;
      }
    });
  });

  // Calculate Rankers (Top 3 passing students)
  const rankers = [...reportData]
    .filter(s => {
      let isActuallyPassing = s.percentage >= 35;
      subjectList.forEach((sub: any) => {
        const m = s.marks[sub.id];
        const isGraded = sub.is_graded;
        const passingMark = s.passingMarksPerSubject || passingMarksPerSubject;
        
        if (m === undefined || m === null) {
          isActuallyPassing = false;
        } else if (isGraded) {
          if (m === 'FAIL') isActuallyPassing = false;
        } else if (m < passingMark) {
          isActuallyPassing = false;
        }
      });
      return isActuallyPassing;
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const rankLabels = ['FIRST', 'SECOND', 'THIRD'];

  return (
    <div 
      ref={ref}
      id="consolidated-report-pdf-template"
      style={{
        width: '1123px', // A4 Landscape
        minHeight: '794px',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif",
        padding: '20px',
        boxSizing: 'border-box',
        color: '#000'
      }}
    >
      {/* HEADER SECTION - 3 Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px', alignItems: 'center', marginBottom: '5px' }}>
        {/* Left Logo */}
        <div style={{ textAlign: 'left' }}>
          {logoBase64 && (
            <img 
              src={logoBase64} 
              alt="Logo" 
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Center Text */}
        <div style={{ textAlign: 'center' }}>
           <p style={{ 
             fontSize: '11pt', 
             fontStyle: 'italic', 
             margin: '0 0 2px 0', 
             fontWeight: 'bold', 
             color: '#000',
             lineHeight: '1.2'
           }}>
             "{ (college.slogan && college.slogan.trim()) ? college.slogan.trim() : 'Knowledge is the Key to Success' }"
           </p>
           {college.sub_slogan && college.sub_slogan.trim() && (
             <p style={{ 
               fontSize: '10pt', 
               margin: '0 0 4px 0', 
               fontWeight: 'bold', 
               color: '#444',
               lineHeight: '1.2'
             }}>
               {college.sub_slogan.trim()}
             </p>
           )}
           {college.institute_name && college.institute_name.trim() && (
             <p style={{
               fontSize: '11pt',
               margin: '0 0 4px 0',
               fontWeight: 'bold',
               color: '#3b82f6',
               textTransform: 'uppercase',
               letterSpacing: '1px'
             }}>
               {college.institute_name.trim()}
             </p>
           )}
           <h1 style={{ 
             fontSize: '26pt', 
             fontWeight: '900', 
             margin: '4px 0', 
             textTransform: 'uppercase', 
             color: '#000', 
             letterSpacing: '0.5px',
             lineHeight: '1.1'
           }}>
             {college.college_name.toUpperCase()}
           </h1>
           {college.address && (
             <p style={{ fontSize: '10pt', color: '#444', margin: '4px 0 0 0', fontWeight: 'bold' }}>
               {college.address}
             </p>
           )}
           {college.registration_number && pdfSettings?.show_college_reg_no !== false && (
             <p style={{ fontSize: '9pt', color: '#6b7280', margin: '2px 0 0 0', fontWeight: 'bold' }}>
               REG NO: {college.registration_number}
             </p>
           )}
        </div>

        {/* Right Portrait */}
        <div style={{ textAlign: 'right' }}>
          {portraitBase64 && (
            <img 
              src={portraitBase64} 
              alt="Dr. Bapuji Salunkhe" 
              style={{ width: '120px', height: '120px', objectFit: 'contain' }}
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </div>

      {/* Thick Horizontal Line */}
      <div style={{ width: '100%', borderBottom: '3pt solid #000', marginBottom: '15px' }}></div>

      {/* Report Title Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', padding: '0 5px' }}>
        <div style={{ textAlign: 'left' }}>
          <h3 style={{ fontSize: '12pt', fontWeight: 'bold', margin: '0' }}>{exam.exam_name} (Result Sheet)</h3>
          <p style={{ fontSize: '10pt', margin: '2px 0' }}>Academic Year: ({batch.batch_year}-{batch.batch_year + 1}) - Batch: {batch.colleges?.college_code 
            ? (batch.batch_code.startsWith(`${batch.colleges.college_code}-`) 
                ? batch.batch_code 
                : `${batch.colleges.college_code}-${batch.batch_code}`)
            : batch.batch_code}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>CLASS - {(batch.customClassName || batch.class_name || '').toUpperCase()}</div>
           <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>CLASS TEACHER - {(classTeacherName || 'ABC').toUpperCase()}</div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1pt solid black' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e243a', color: '#ffffff', height: '35px' }}>
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '40px', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>Roll No</th>
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '80px', fontSize: '8pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>PEN NO</th>
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '60px', fontSize: '8pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>SET NO</th>
            <th style={{ border: '1pt solid black', padding: '4px 8px', textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>STUDENT'S NAME</th>
            {subjectList.map((sub: any) => (
              <th key={sub.id} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '85px', fontSize: '8pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff', wordWrap: 'break-word' }}>
                {sub.name.toUpperCase()}
              </th>
            ))}
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '70px', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>Obt.mark</th>
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '80px', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>PERCENTAGE</th>
            <th style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', width: '65px', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>REMARK</th>
          </tr>
          {/* Out of Row */}
          <tr style={{ backgroundColor: '#f0f0f0', fontWeight: 'bold', height: '30px' }}>
            <td style={{ border: '1pt solid black', padding: '4px', verticalAlign: 'middle' }}></td>
            <td style={{ border: '1pt solid black', padding: '4px', verticalAlign: 'middle' }}></td>
            <td style={{ border: '1pt solid black', padding: '4px', verticalAlign: 'middle' }}></td>
            <td style={{ border: '1pt solid black', padding: '4px 8px', textAlign: 'right', fontSize: '9pt', verticalAlign: 'middle', paddingRight: '12px' }}>Out of</td>
            {subjectList.map((sub: any) => (
              <td key={sub.id} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle' }}>
                {sub.is_graded ? '---' : maxMarksPerSubject}
              </td>
            ))}
            <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle' }}>{totalMaxMarks}</td>
            <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', fontWeight: 'bold', verticalAlign: 'middle' }}>100%</td>
            <td style={{ border: '1pt solid black', padding: '4px', verticalAlign: 'middle' }}></td>
          </tr>
        </thead>
        <tbody>
          {reportData.map((row, rowIdx) => {
            const subPassMarks = row.passingMarksPerSubject || passingMarksPerSubject;
            let failCount = 0;
            
            return (
              <tr key={row.id} style={{ backgroundColor: rowIdx % 2 !== 0 ? '#f0f4f8' : '#ffffff', height: '28px' }}>
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{row.roll}</td>
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt', verticalAlign: 'middle' }}>{row.pen_number || '---'}</td>
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt', verticalAlign: 'middle' }}>{row.exam_set_number || '---'}</td>
                <td style={{ border: '1pt solid black', padding: '4px 8px', textTransform: 'uppercase', fontSize: '9pt', textAlign: 'left', verticalAlign: 'middle', paddingLeft: '8px' }}>{row.name}</td>
                {subjectList.map((sub: any) => {
                  const markOrGrade = row.marks[sub.id];
                  const isGraded = sub.is_graded;
                  const isFail = !isGraded 
                    ? (markOrGrade === undefined || markOrGrade === null || markOrGrade < subPassMarks)
                    : (markOrGrade === 'FAIL');
                  
                  if (isFail) failCount++;
                  return (
                    <td key={sub.id} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', color: isFail ? '#dc2626' : 'inherit', fontWeight: isFail ? 'bold' : 'normal', fontSize: '9pt', verticalAlign: 'middle' }}>
                      {markOrGrade !== undefined && markOrGrade !== null ? markOrGrade : 'ABSENT'}
                    </td>
                  );
                })}
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '9pt', verticalAlign: 'middle' }}>{row.total}</td>
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{row.percentage.toFixed(2)}</td>
                <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>
                  {failCount > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>F{failCount}</span>
                  ) : row.percentage >= 35 ? (
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>PASS</span>
                  ) : (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>FAIL</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY TABLES ROW */}
      <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Statistics Table */}
        <div style={{ width: '42%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1pt solid black' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e243a', color: '#ffffff', height: '28px' }}>
                <th style={{ border: '1pt solid black', padding: '4px 6px', textAlign: 'center', fontSize: '8pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>CATEGORY</th>
                {subjectList.map((sub: any) => <th key={sub.id} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt', fontWeight: 'bold', verticalAlign: 'middle', color: '#ffffff' }}>{sub.name.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {['PASS', 'FAIL', 'ABSENT', 'NSOFF'].map(cat => (
                <tr key={cat} style={{ height: '25px' }}>
                  <td style={{ border: '1pt solid black', padding: '4px 6px', fontWeight: 'bold', fontSize: '8pt', textAlign: 'left', verticalAlign: 'middle' }}>{cat}</td>
                  {summary[cat].map((c: number, i: number) => <td key={i} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt', verticalAlign: 'middle' }}>{c}</td>)}
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#ffffff', height: '25px' }}>
                <td style={{ border: '1pt solid black', padding: '4px 6px', fontSize: '8pt', textAlign: 'left', verticalAlign: 'middle' }}>TOTAL</td>
                {subjectList.map((_: any, i: number) => (
                  <td key={i} style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '8pt', verticalAlign: 'middle' }}>
                    {summary.PASS[i] + summary.FAIL[i] + summary.ABSENT[i] + summary.NSOFF[i]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Rank Table */}
        <div style={{ width: '55%' }}>
          <h4 style={{ fontSize: '10pt', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center', color: '#000' }}>RANK HOLDERS</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1pt solid black' }}>
            <thead>
              <tr style={{ backgroundColor: '#1e243a', color: '#ffffff', height: '28px' }}>
                <th style={{ border: '1pt solid black', padding: '4px', width: '60px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>RANK</th>
                <th style={{ border: '1pt solid black', padding: '4px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>NAME</th>
                <th style={{ border: '1pt solid black', padding: '4px', width: '75px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>OUT OF</th>
                <th style={{ border: '1pt solid black', padding: '4px', width: '75px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>OBTAINED</th>
                <th style={{ border: '1pt solid black', padding: '4px', width: '75px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>PERC.</th>
                <th style={{ border: '1pt solid black', padding: '4px', width: '60px', fontSize: '9pt', fontWeight: 'bold', textAlign: 'center', verticalAlign: 'middle', color: '#ffffff' }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              {rankLabels.map((lbl, idx) => {
                const s = rankers[idx];
                return (
                  <tr key={lbl} style={{ height: '28px', backgroundColor: '#ffffff' }}>
                    <td style={{ border: '1pt solid black', padding: '4px 6px', fontWeight: 'bold', fontSize: '9pt', textAlign: 'left', verticalAlign: 'middle' }}>{lbl}</td>
                    <td style={{ border: '1pt solid black', padding: '4px', fontSize: '9pt', textAlign: 'center', verticalAlign: 'middle' }}>{s ? s.name.toUpperCase() : '---'}</td>
                    <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{s ? totalMaxMarks : '---'}</td>
                    <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{s ? s.total : '---'}</td>
                    <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{s ? s.percentage.toFixed(2) + '%' : '---'}</td>
                    <td style={{ border: '1pt solid black', padding: '4px', textAlign: 'center', fontSize: '9pt', verticalAlign: 'middle' }}>{s ? 'PASS' : '---'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER SIGNATURES */}
      <div style={{ marginTop: '80px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '150px', borderTop: '1.5pt solid #000', marginBottom: '8px' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '11pt', margin: '0' }}>Class Teacher</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '150px', borderTop: '1.5pt solid #000', marginBottom: '8px' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '11pt', margin: '0' }}>H.O.D.</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '150px', borderTop: '1.5pt solid #000', marginBottom: '8px' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '11pt', margin: '0' }}>Principal Signature</p>
        </div>
      </div>
    </div>
  );
});


ConsolidatedReportPDF.displayName = 'ConsolidatedReportPDF';

export default ConsolidatedReportPDF;
