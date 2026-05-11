import React from 'react'

const ExamResultPDF = React.forwardRef(({ student, exam, results, college, pdfSettings }: any, ref: any) => {

  const numericResults = (results || []).filter((r: any) => !r.is_graded);
  const totalGained = numericResults.reduce((s: any, r: any) => s + Number(r.gained_marks), 0)
  const totalOutOf = numericResults.reduce((s: any, r: any) => s + Number(r.out_of_marks), 0)
  const percentage = totalOutOf > 0 ? (totalGained / totalOutOf * 100).toFixed(2) : '0.00'
  const isPassed = results.every((r: any) => {
    if (r.is_graded) return r.grade !== 'FAIL' && r.grade !== 'E';
    const subjectPct = r.out_of_marks > 0
      ? (Number(r.gained_marks) / Number(r.out_of_marks)) * 100
      : 0
    return subjectPct >= 35
  })
  const overallGrade = parseFloat(percentage) >= 90 ? 'A+' : parseFloat(percentage) >= 75 ? 'A' : parseFloat(percentage) >= 60 ? 'B' : parseFloat(percentage) >= 45 ? 'C' : parseFloat(percentage) >= 35 ? 'D' : 'F'

  const sortedResults = [...(results || [])].sort((a: any, b: any) => (!!a.is_graded === !!b.is_graded ? 0 : a.is_graded ? 1 : -1));

  return (
    <div ref={ref} style={{
      width: '794px',
      minHeight: '1123px',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      padding: '32px 40px',
      boxSizing: 'border-box',
      color: '#111827'
    }}>

      {/* TOP HEADER WITH LOGO + COLLEGE NAME + PORTRAIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px', alignItems: 'center', marginBottom: '8px' }}>
        {/* Left Logo */}
        <div style={{ textAlign: 'left' }}>
          {college.logo_url ? (
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
             "{ college.slogan || 'ज्ञानविज्ञान आणि सुसंस्कार यासाठी शिक्षण प्रसार' }"
           </p>
           <p style={{ 
             fontSize: '10px', 
             margin: '0 0 4px 0', 
             fontWeight: 'bold', 
             color: '#444',
             lineHeight: '1.2'
           }}>
             {college.sub_slogan || 'शिक्षणमहर्षी डॉ. बापूजी साळुंके'}
           </p>
           {college.institute_name && (
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
             {college.college_name.toUpperCase()}
           </h1>
           {college.address && (
             <p style={{ fontSize: '10px', color: '#444', margin: '4px 0 0 0', fontWeight: 'bold' }}>
               {college.address}
             </p>
           )}
           {college.registration_number && pdfSettings?.show_college_reg_no !== false && (
             <p style={{ fontSize: '9px', color: '#6b7280', margin: '2px 0 0 0', fontWeight: 'bold' }}>
               REG NO: {college.registration_number}
             </p>
           )}
        </div>

        {/* Right Portrait */}
        <div style={{ textAlign: 'right' }}>
          {college.portrait_url ? (
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


      {/* EXAM TITLE ROW */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 'bold',
            color: '#111827',
            margin: '0 0 2px 0'
          }}>
            {exam.exam_name} (Result Sheet)
          </h2>
          <p style={{ fontSize: '11px', color: '#6b7280', margin: '0' }}>
            Academic Year ({student.batches?.batch_year}-{parseInt(student.batches?.batch_year) + 1})
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#1e40af',
            margin: '0'
          }}>
            CLASS: {student.batches?.class_name?.toUpperCase()}
          </p>
          <p style={{
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#374151',
            margin: '4px 0 0 0'
          }}>
            ROLL NO: {student.roll_number}
          </p>
        </div>
      </div>

      {/* STUDENT NAME BANNER */}
      <div style={{
        backgroundColor: '#f0f4ff',
        border: '1px solid #c7d2fe',
        borderRadius: '4px',
        padding: '10px 16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left Column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>NAME OF STUDENT:</p>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#111827', margin: '0', textTransform: 'uppercase' }}>{student.student_name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MOTHER'S NAME:</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0', textTransform: 'uppercase' }}>{student.mother_name || '---'}</p>
            </div>
          </div>
          {/* Right Column */}
          <div style={{ textAlign: 'right' }}>
            {pdfSettings?.show_pen_no !== false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase' }}>PEN NO:</p>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{student.pen_number || '---'}</p>
              </div>
            )}
            {pdfSettings?.show_exam_seat_no !== false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase' }}>SET NO:</p>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{student.seat_number || student.exam_set_number || '---'}</p>
              </div>
            )}
            {pdfSettings?.show_reg_no !== false && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '4px' }}>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', margin: '0', textTransform: 'uppercase' }}>REG NO:</p>
                <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#374151', margin: '0' }}>{student.reg_number || student.registration_number || '---'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MARKS TABLE */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
        marginBottom: '20px',
        border: '1px solid #374151'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#1e3a8a' }}>
            <th style={{
              padding: '10px 14px',
              textAlign: 'left',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '1px solid #3b82f6',
              width: '50px'
            }}>Sr.</th>
            <th style={{
              padding: '10px 14px',
              textAlign: 'left',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '1px solid #3b82f6'
            }}>Subject Name</th>
            <th style={{
              padding: '10px 14px',
              textAlign: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '1px solid #3b82f6',
              width: '100px'
            }}>Out Of</th>
            <th style={{
              padding: '10px 14px',
              textAlign: 'center',
              color: '#ffffff',
              fontWeight: 'bold',
              border: '1px solid #3b82f6',
              width: '100px'
            }}>Obtained</th>
            <th style={{
              padding: '10px 14px',
              textAlign: 'center',
              color: '#fbbf24',
              fontWeight: 'bold',
              border: '1px solid #3b82f6',
              width: '80px'
            }}>Grade</th>
          </tr>
        </thead>
        <tbody>
          {sortedResults.filter((r: any) => !r.is_graded || (exam?.exam_name?.toLowerCase().includes('annual'))).map((r: any, i: number) => {
            const isGraded = !!r.is_graded;
            const pct = r.out_of_marks > 0 ? (r.gained_marks / r.out_of_marks) * 100 : 0
            const grade = isGraded ? (r.grade || 'N/A') : (pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : pct >= 35 ? 'D' : 'F')
            const fail = isGraded ? (grade === 'FAIL' || grade === 'E' || grade === 'F' || grade === 'N/A') : (pct < 35)
            return (
              <tr key={i} style={{
                backgroundColor: fail ? '#fff1f2' : i % 2 === 0 ? '#f9fafb' : '#ffffff'
              }}>
                <td style={{
                  padding: '10px 14px',
                  color: '#374151',
                  border: '1px solid #d1d5db'
                }}>{i + 1}</td>
                <td style={{
                  padding: '10px 14px',
                  color: '#111827',
                  fontWeight: '600',
                  border: '1px solid #d1d5db',
                  textTransform: 'uppercase'
                }}>{r.subject_name.replace(/\(ALT\)/gi, '').replace(/ALT/gi, '').trim().toUpperCase()}{isGraded && <span style={{fontSize: '9px', marginLeft: '5px', color: '#8b5cf6'}}>(GRADE)</span>}</td>
                <td style={{
                  padding: '10px 14px',
                  textAlign: 'center',
                  color: '#374151',
                  border: '1px solid #d1d5db'
                }}>{isGraded ? '-' : r.out_of_marks}</td>
                <td style={{
                  padding: '10px 14px',
                  textAlign: 'center',
                  color: fail ? '#dc2626' : '#374151',
                  fontWeight: fail ? 'bold' : 'normal',
                  border: '1px solid #d1d5db'
                }}>{isGraded ? '-' : r.gained_marks}</td>
                <td style={{
                  padding: '10px 14px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: fail ? '#dc2626' : (isGraded ? '#8b5cf6' : '#16a34a'),
                  border: '1px solid #d1d5db'
                }}>{grade}</td>
              </tr>
            )
          })}

          {/* TOTAL ROW */}
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <td colSpan={2} style={{
              padding: '10px 14px',
              textAlign: 'right',
              fontWeight: 'bold',
              color: '#111827',
              border: '1px solid #d1d5db',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontSize: '12px'
            }}>TOTAL</td>
            <td style={{
              padding: '10px 14px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#111827',
              border: '1px solid #d1d5db'
            }}>{totalOutOf}</td>
            <td style={{
              padding: '10px 14px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: '#111827',
              border: '1px solid #d1d5db'
            }}>{totalGained}</td>
            <td style={{
              padding: '10px 14px',
              textAlign: 'center',
              fontWeight: 'bold',
              color: isPassed ? '#16a34a' : '#dc2626',
              border: '1px solid #d1d5db'
            }}>{overallGrade}</td>
          </tr>
        </tbody>
      </table>

      {/* PERCENTAGE + RESULT BOX */}
      <div style={{ border: '2px solid #1e3a8a', borderRadius: '6px', overflow: 'hidden', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', borderRight: '1px solid #1e3a8a' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0', letterSpacing: '1px' }}>PERCENTAGE</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: '0' }}>{percentage}%</p>
          </div>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', backgroundColor: isPassed ? '#f0fdf4' : '#fef2f2' }}>
            <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', margin: '0', letterSpacing: '1px' }}>FINAL RESULT</p>
            <p style={{ fontSize: '20px', fontWeight: 'bold', color: isPassed ? '#16a34a' : '#dc2626', margin: '0', letterSpacing: '2px' }}>
              {isPassed ? 'PASS' : 'FAIL'}
            </p>
          </div>
        </div>
      </div>

      {/* SIGNATURE SECTION */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: '40px',
        paddingTop: '16px',
        borderTop: '1px solid #d1d5db'
      }}>
        <div style={{ textAlign: 'center', width: '150px' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#374151',
              margin: '0'
            }}>Class Teacher</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '150px' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#374151',
              margin: '0'
            }}>H.O.D.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', width: '150px' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '6px' }}>
            <p style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#374151',
              margin: '0'
            }}>Principal Signature</p>
          </div>
        </div>
      </div>

    </div>
  )
})

ExamResultPDF.displayName = 'ExamResultPDF'

export default ExamResultPDF
