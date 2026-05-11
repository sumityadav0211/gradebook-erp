import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface GenerateConsolidatedPDFProps {
  batchName: string;
  examName: string;
}

export const generateConsolidatedPDF = async ({ batchName, examName }: GenerateConsolidatedPDFProps) => {
  try {
    const element = document.getElementById('consolidated-report-pdf-template');
    if (!element) {
      throw new Error('PDF template not found');
    }

    // Capture using html2canvas with requested settings
    // If it's already in the DOM (even if hidden with left: -9999px), html2canvas can still capture it if we configure it correctly.
    const canvas = await html2canvas(element, {
      scale: 3, 
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 1123,
      windowWidth: 1123,
      logging: false,
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

        // Find the template in the cloned document
        const clonedTemplate = clonedDoc.getElementById('consolidated-report-pdf-template');
        if (!clonedTemplate) return;

        // Force font and layout in cloned element
        clonedTemplate.style.fontFamily = "'Inter', 'Noto Sans Devanagari', sans-serif";
        clonedTemplate.style.position = 'relative';
        clonedTemplate.style.left = '0';
        clonedTemplate.style.top = '0';
        clonedTemplate.style.visibility = 'visible';
        clonedTemplate.style.display = 'block';

        // Remove problematic styles while keeping layout
        const styleSheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
        styleSheets.forEach(s => {
          // Keep the Google Font stylesheet if possible
          if (s.tagName === 'LINK' && (s as HTMLLinkElement).href.includes('fonts.googleapis.com')) {
            return;
          }
          s.remove();
        });

        // Add essential styles for table rendering
        const style = clonedDoc.createElement('style');
        style.innerHTML = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');
          * { 
            box-sizing: border-box; 
            font-family: 'Inter', 'Noto Sans Devanagari', sans-serif !important;
          }
          table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
          th, td { border: 1px solid #000; padding: 6px 4px; line-height: 1.2; }
          .flex { display: flex; }
          .justify-center { justify-content: center; }
          .items-center { align-items: center; }
          .relative { position: relative; }
          .absolute { position: absolute; }
          h1, h2, h3, p { margin: 2px 0; }
        `;
        clonedDoc.head.appendChild(style);
      }
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const fileName = `${batchName.replace(/\s+/g, '_')}_${examName.replace(/\s+/g, '_')}_Result_Sheet.pdf`;
    pdf.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
};
