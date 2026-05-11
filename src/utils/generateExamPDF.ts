import ReactDOM from 'react-dom/client'
import React from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import ExamResultPDF from '../components/PDF/ExamResultPDF'
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

export default async function generateExamPDF({
  student,
  exam,
  results,
  college,
  pdfSettings
}: {
  student: any
  exam: any
  results: any[]
  college: any
  pdfSettings?: any
}) {

  // STEP 1: Create hidden container
  const isLandscape = pdfSettings?.exam_orientation === 'landscape';
  const widthPx = isLandscape ? 1123 : 794;
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;`
  document.body.appendChild(container)

  // STEP 2: Render React component
  const root = ReactDOM.createRoot(container)
  root.render(
    React.createElement(ExamResultPDF, { student, exam, results, college, pdfSettings })
  )

  // STEP 3: Wait for render
  await new Promise(r => setTimeout(r, 400))

  // STEP 4: Wait for all images to load
  const images = container.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve
        setTimeout(resolve, 4000)
      })
    })
  )

  // STEP 5: Extra buffer
  await new Promise(r => setTimeout(r, 300))

  // STEP 6: Capture with html2canvas + oklch fix
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
      // Fix oklch colors
      removeOklchFromDocument(clonedDoc)

      // Fix crossOrigin on images
      const imgs = clonedDoc.querySelectorAll('img')
      imgs.forEach(img => {
        img.crossOrigin = 'anonymous'
      })

      // Remove external stylesheets to prevent oklch parsing
      const links = clonedDoc.querySelectorAll('link[rel="stylesheet"]')
      links.forEach(link => link.remove())
    }
  })

  // STEP 7: Cleanup
  root.unmount()
  document.body.removeChild(container)

  // STEP 8: Generate PDF
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'px', format: 'a4' })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

  // STEP 9: Download
  const fileName = `${student.student_name}_${exam.exam_name}_${student.roll_number}.pdf`
  pdf.save(fileName)

  // STEP 10: Upload to Supabase storage
  try {
    const blob = pdf.output('blob')
    const filePath = `${student.id}/${exam.id}/result.pdf`
    await supabase.storage
      .from('result-pdfs')
      .upload(filePath, blob, { contentType: 'application/pdf', upsert: true })

    const { data: urlData } = supabase.storage
      .from('result-pdfs')
      .getPublicUrl(filePath)

    await supabase.from('pdf_records').insert({
      student_id: student.id,
      exam_id: exam.id,
      college_id: college.id,
      type: 'individual',
      storage_url: urlData.publicUrl,
      file_name: fileName
    })

    return urlData.publicUrl
  } catch (err) {
    console.error('Storage upload failed:', err)
    return null
  }
}
