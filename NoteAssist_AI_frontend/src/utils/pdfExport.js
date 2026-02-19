// FILE: src/utils/pdfExport.js
// Utilities for exporting content to PDF
// ============================================================================

import html2pdf from 'html2pdf.js';

export const exportToPDF = (
  content,
  filename = 'export.pdf',
  title = null,
  metadata = {}
) => {
  try {
    const { element, opt } = buildPdfElement(content, filename, title, metadata);
    html2pdf().set(opt).from(element).save();
    return { success: true, filename: opt.filename };
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF: ' + error.message);
  }
};

const buildPdfElement = (content, filename, title, metadata = {}) => {
  const element = document.createElement('div');

  let html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 210mm; color: #333;">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        h1, h2, h3, h4, h5, h6 {
          color: #1f2937;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        h1 { font-size: 28px; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5em; }
        h2 { font-size: 22px; }
        h3 { font-size: 18px; }
        p { line-height: 1.6; margin: 0.5em 0; }
        pre {
          background: #f3f4f6;
          padding: 12px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          border-left: 3px solid #3b82f6;
        }
        code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        ul, ol { margin: 0.5em 0; padding-left: 2em; }
        li { margin: 0.25em 0; }
        table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .metadata {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 1em;
          padding-bottom: 1em;
          border-bottom: 1px solid #e5e7eb;
        }
        .page-break { page-break-after: always; }
      </style>
  `;

  if (title) {
    html += `<h1>${title}</h1>`;
  }

  if (Object.keys(metadata).length > 0) {
    html += '<div class="metadata">';
    Object.entries(metadata).forEach(([key, value]) => {
      html += `<div><strong>${key}:</strong> ${value}</div>`;
    });
    html += '</div>';
  }

  html += `${content}</div>`;
  element.innerHTML = html;

  const opt = {
    margin: [10, 10, 10, 10],
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, letterRendering: true },
    jsPDF: {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    },
    pagebreak: { mode: ['css', 'legacy'] }
  };

  return { element, opt };
};

export const exportToPDFBlob = async (content, filename = 'export.pdf', title = null, metadata = {}) => {
  try {
    const { element, opt } = buildPdfElement(content, filename, title, metadata);
    const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
    return { blob, filename: opt.filename };
  } catch (error) {
    console.error('PDF export error:', error);
    throw new Error('Failed to export PDF: ' + error.message);
  }
};

export const exportCodeToPDF = (code, filename, language, metadata = {}, executionOutput = null, execSuccess = null) => {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  let content = `
    <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px;">Source Code</h2>
    <pre><code>${escapedCode}</code></pre>
  `;

  // Add execution output if available
  if (executionOutput && executionOutput.trim()) {
    const escapedOutput = executionOutput
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const outputColor = execSuccess === false ? '#dc2626' : '#16a34a';
    const outputBg = execSuccess === false ? '#fef2f2' : '#f0fdf4';
    const outputBorder = execSuccess === false ? '#fecaca' : '#bbf7d0';
    const statusText = execSuccess === false ? 'Error' : 'Success';

    content += `
      <div style="margin-top: 24px;">
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px;">
          Execution Output 
          <span style="font-size: 12px; padding: 2px 8px; border-radius: 4px; background: ${outputBg}; color: ${outputColor}; margin-left: 8px;">
            ${statusText}
          </span>
        </h2>
        <pre style="background: ${outputBg}; border-left-color: ${outputBorder}; color: ${outputColor};"><code>${escapedOutput}</code></pre>
      </div>
    `;
  }

  return exportToPDF(content, filename, `Code - ${language}`, {
    'Language': language,
    ...metadata
  });
};

export const exportCodeToPDFBlob = async (code, filename, language, metadata = {}, executionOutput = null, execSuccess = null) => {
  const escapedCode = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  let content = `
    <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px;">Source Code</h2>
    <pre><code>${escapedCode}</code></pre>
  `;

  // Add execution output if available
  if (executionOutput && executionOutput.trim()) {
    const escapedOutput = executionOutput
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    const outputColor = execSuccess === false ? '#dc2626' : '#16a34a';
    const outputBg = execSuccess === false ? '#fef2f2' : '#f0fdf4';
    const outputBorder = execSuccess === false ? '#fecaca' : '#bbf7d0';
    const statusText = execSuccess === false ? 'Error' : 'Success';

    content += `
      <div style="margin-top: 24px;">
        <h2 style="color: #1f2937; margin-top: 0; margin-bottom: 12px; font-size: 16px;">
          Execution Output 
          <span style="font-size: 12px; padding: 2px 8px; border-radius: 4px; background: ${outputBg}; color: ${outputColor}; margin-left: 8px;">
            ${statusText}
          </span>
        </h2>
        <pre style="background: ${outputBg}; border-left-color: ${outputBorder}; color: ${outputColor};"><code>${escapedOutput}</code></pre>
      </div>
    `;
  }

  return exportToPDFBlob(content, filename, `Code - ${language}`, {
    'Language': language,
    ...metadata
  });
};

export const exportMarkdownToPDF = (markdownContent, filename, title, metadata = {}) => {
  // Simple markdown to HTML conversion (you might want to use a proper markdown library)
  let htmlContent = markdownContent
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  htmlContent = `<p>${htmlContent}</p>`;

  return exportToPDF(htmlContent, filename, title, metadata);
};
