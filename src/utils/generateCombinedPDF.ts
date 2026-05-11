import ReactDOM from 'react-dom/client'
import React from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import CombinedResultPDF from '../components/PDF/CombinedResultPDF'
import { supabase } from '../lib/supabase'

function removeOklchFromDocument(doc: Document) {
  // 1. Remove ALL existing style tags and link tags to prevent html2canvas from parsing problematic CSS
  const styleSheets = doc.querySelectorAll('style, link[rel="stylesheet"]');
  styleSheets.forEach(tag => tag.remove());

  // 2. Inject a very basic reset to ensure layout stays consistent without external CSS
  const styleEl = doc.createElement('style')
  styleEl.textContent = `
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      font-family: Arial, sans-serif !important;
    }
    body, html {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
    }
    img {
      max-width: 100% !important;
      display: block !important;
    }
  `
  doc.head.appendChild(styleEl)

  // 3. CRITICAL: Remove all class names from all elements
  // Since we use inline styles for the PDF, we don't need classes.
  // This prevents html2canvas from trying to match elements to problematic global CSS.
  const allElements = doc.querySelectorAll('*')
  allElements.forEach(el => {
    const htmlEl = el as HTMLElement
    
    // Remove classes
    htmlEl.removeAttribute('class');

    // Clean inline styles of oklch
    const inlineStyle = htmlEl.getAttribute('style') || ''
    if (inlineStyle.includes('oklch')) {
      htmlEl.setAttribute(
        'style',
        inlineStyle.replace(/oklch\([^)]*\)/g, '#000000')
      )
    }
  })
}

export async function prepareCombinedPDFData({
  student,
  supabase: supabaseClient
}: {
  student: any
  supabase: any
}) {
  // STEP 1: Fetch college with logo and portrait
  const collegeId = student.college_id || student.batches?.college_id;
  const { data: college } = await supabaseClient
    .from('colleges')
    .select('*')
    .eq('id', collegeId)
    .single()

  // STEP 1.5: Fetch PDF configuration
  const { data: pdfSettings } = await supabaseClient
    .from('pdf_settings')
    .select('*')
    .eq('college_id', collegeId)
    .single();

  // STEP 2: Fetch batch info
  const { data: batch } = await supabaseClient
    .from('batches')
    .select('*')
    .eq('id', student.batch_id)
    .single()

  // STEP 3: Fetch all exams for this batch
  const { data: exams } = await supabaseClient
    .from('exams')
    .select('*')
    .eq('batch_id', student.batch_id)
    .order('created_at')

  // STEP 4: Fetch batch subjects with subject details
  const { data: batchSubjects } = await supabaseClient
    .from('batch_subjects')
    .select('subjects(id, subject_name, is_graded, subject_group)')
    .eq('batch_id', student.batch_id)

  const preferences = student.subject_preferences || {};

  // STEP 5: Fetch all results for this student
  const { data: results } = await supabaseClient
    .from('results')
    .select('*, exams(out_of_marks)')
    .eq('student_id', student.id)

  // STEP 6: Build subjectRows
  const subjectRows = (batchSubjects || []).map((bs: any) => {
    const subject = Array.isArray(bs.subjects) ? bs.subjects[0] : bs.subjects;
    if (!subject) return null;

    // Filter by student preference if group exists
    if (subject.subject_group) {
        const preferredId = preferences[subject.subject_group];
        if (preferredId && preferredId !== subject.id) return null;
    }

    const isGraded = subject.is_graded || subject.subject_name.toLowerCase().includes('sport');
    const marks: Record<string, { gained: number; outOf: number; grade?: string }> = {}
    
    let totalObtained = 0
    let totalOutOf = 0
    let lastGrade = '';

    ;(exams || []).forEach((exam: any) => {
      const result = (results || []).find(
        (r: any) => r.subject_id === subject.id && r.exam_id === exam.id
      )
      if (result) {
        marks[exam.id] = {
          gained: Number(result.gained_marks || 0),
          outOf: Number(result.exams?.out_of_marks || exam.out_of_marks || 0),
          grade: result.grade
        }
        if (!isGraded) {
          totalObtained += Number(result.gained_marks || 0)
          totalOutOf += Number(result.exams?.out_of_marks || exam.out_of_marks || 0)
        } else {
          lastGrade = result.grade || lastGrade;
        }
      } else {
        if (!isGraded) {
          totalOutOf += Number(exam.out_of_marks || 0)
        }
      }
    })

    // AGGREGATE FORMULA: divide both by 2
    const aggregateMarks = isGraded ? 0 : totalObtained / 2
    const aggregateOutOf = isGraded ? 0 : totalOutOf / 2
    
    const percentage = !isGraded && aggregateOutOf > 0
      ? (aggregateMarks / aggregateOutOf) * 100
      : 0

    const grade = isGraded 
      ? (lastGrade || '-')
      : (percentage >= 90 ? 'A+' :
         percentage >= 75 ? 'A' :
         percentage >= 60 ? 'B' :
         percentage >= 45 ? 'C' :
         percentage >= 35 ? 'D' : 'F')

    return {
      subject_name: subject.subject_name.replace(/\(ALT\)/gi, '').replace(/ALT/gi, '').trim().toUpperCase(),
      subject_group: subject.subject_group,
      marks,              // raw exam marks for table display
      totalObtained: isGraded ? 0 : totalObtained,      // sum of all exam obtained marks
      totalOutOf: isGraded ? 0 : totalOutOf,         // sum of all exam out_of marks
      aggregateMarks,     // totalObtained / 2
      aggregateOutOf,     // totalOutOf / 2
      percentage,         // aggregate percentage
      grade,
      is_graded: isGraded
    }
  }).filter(Boolean) as any[]

  // Grand total aggregate: only count non-graded subjects
  const grandTotalObtained = subjectRows.reduce((s: number, r: any) => s + (r.is_graded ? 0 : r.totalObtained), 0)
  const grandTotalOutOf = subjectRows.reduce((s: number, r: any) => s + (r.is_graded ? 0 : r.totalOutOf), 0)
  const grandAggregateMarks = grandTotalObtained / 2
  const grandAggregateOutOf = grandTotalOutOf / 2
  const aggregatePct = grandAggregateOutOf > 0
    ? (grandAggregateMarks / grandAggregateOutOf * 100).toFixed(2)
    : '0.00'

  // PASS/FAIL: pass if aggregate percentage for EVERY subject is >= 35%
  let isPassed = true
  const failingCells: Record<string, boolean> = {}

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

  return {
    student,
    college,
    batch,
    allExams: exams || [],
    subjectRows,
    grandAggregateMarks,
    grandAggregateOutOf,
    aggregatePct,
    isPassed,
    failingCells,
    pdfSettings: pdfSettings || {}
  }
}

export default async function generateCombinedPDF({
  student,
  supabase: supabaseClient,
  pdfSettings
}: {
  student: any
  supabase: any
  pdfSettings?: any
}) {
  const pdfData = await prepareCombinedPDFData({ student, supabase: supabaseClient });
  
  // Use passed pdfSettings or fallback to fetched ones
  const finalSettings = pdfSettings || pdfData.pdfSettings;
  const college = pdfData.college;
  const fileName = `${pdfData.student.student_name}_Aggregate_Report_${pdfData.student.roll_number}.pdf`;
  
  const isLandscape = finalSettings?.aggregate_orientation === 'landscape';
  const widthPx = isLandscape ? 1123 : 794;

  // STEP 7: Create hidden container
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;`
  document.body.appendChild(container)

  // STEP 8: Render React component with college data including logo
  const root = ReactDOM.createRoot(container)
  root.render(
    React.createElement(CombinedResultPDF, {
      ...pdfData,
      pdfSettings: finalSettings
    })
  )

  // STEP 9: Wait for initial render
  await new Promise(r => setTimeout(r, 400))

  // STEP 10: Wait for ALL images to finish loading
  const images = container.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve
        setTimeout(resolve, 5000)
      })
    })
  )

  // STEP 11: Extra buffer after images load
  await new Promise(r => setTimeout(r, 400))

  // STEP 12: Capture with html2canvas
  const element = container.firstChild as HTMLElement
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
      removeOklchFromDocument(clonedDoc)

      const imgs = clonedDoc.querySelectorAll('img')
      imgs.forEach(img => {
        img.crossOrigin = 'anonymous'
      })

      const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]')
      links.forEach(link => link.remove())
    }
  })

  // STEP 13: Cleanup
  root.unmount()
  document.body.removeChild(container)

  // STEP 14: Generate PDF
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: 'a4' })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

  // STEP 15: Download
  pdf.save(fileName)

  // STEP 16: Upload to Supabase storage
  try {
    const blob = pdf.output('blob')
    const filePath = `${student.id}/combined/aggregate_report.pdf`

    await supabaseClient.storage
      .from('result-pdfs')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: true
      })

    const { data: urlData } = supabaseClient.storage
      .from('result-pdfs')
      .getPublicUrl(filePath)

    await supabaseClient.from('pdf_records').insert({
      student_id: student.id,
      exam_id: null,
      college_id: college?.id || null,
      type: 'combined',
      storage_url: urlData.publicUrl,
      file_name: fileName
    })

    return urlData.publicUrl
  } catch (err) {
    console.error('Storage upload failed:', err)
    return null
  }
}
