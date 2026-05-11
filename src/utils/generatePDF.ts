import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { SupabaseClient } from '@supabase/supabase-js';

interface ResultItem {
  subject_name: string;
  subject_code: string;
  gained_marks: number;
  out_of_marks: number;
}

export const generateAndSavePDF = async (
  student: any, 
  exam: any, 
  results: ResultItem[], 
  collegeName: string, 
  supabase: SupabaseClient
) => {
  const element = document.getElementById('result-pdf-template');
  if (!element) {
    throw new Error('PDF template element not found in DOM');
  }

  try {
    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Fix for 'oklch' color function error (common in Tailwind v4)
        const styleTags = clonedDoc.querySelectorAll('style');
        styleTags.forEach(tag => {
          if (tag.innerHTML.includes('oklch')) {
            tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
          }
        });

        // Also check any inline styles
        const elementsWithStyle = clonedDoc.querySelectorAll('[style*="oklch"]');
        elementsWithStyle.forEach(el => {
          const style = el.getAttribute('style');
          if (style) {
            el.setAttribute('style', style.replace(/oklch\([^)]+\)/g, '#000000'));
          }
        });

        // Ensure the template itself is visible in the clone
        const clonedElement = clonedDoc.getElementById('result-pdf-template');
        if (clonedElement) {
          clonedElement.style.position = 'relative';
          clonedElement.style.left = '0';
          clonedElement.style.top = '0';
          clonedElement.style.visibility = 'visible';
          clonedElement.style.display = 'block';
          clonedElement.style.margin = '0';
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const fileName = `${student.id}_${exam.id}.pdf`;

    // 1. Download internally for user
    pdf.save(fileName);

    // 2. Prepare Blob for Supabase Upload
    const pdfBlob = pdf.output('blob');

    // 3. Upload to Supabase Storage bucket 'result-pdfs'
    const { error: uploadError } = await supabase
      .storage
      .from('result-pdfs')
      .upload(fileName, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf'
      });

    if (uploadError) {
      if ((uploadError as any).message?.includes('Bucket not found')) {
        throw new Error('Supabase Storage Error: Bucket "result-pdfs" not found. Please go to your Supabase Dashboard -> Storage and create a new public bucket named "result-pdfs" with public access.');
      }
      throw uploadError;
    }

    // 4. Retrieve Public URL
    const { data: urlData } = supabase
      .storage
      .from('result-pdfs')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('PDF Generation/Upload Error:', error);
    throw new Error(error.message || 'Failed to generate academic record');
  }
};
