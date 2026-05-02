import { buildPdfDocumentHtml, openPdfDocument } from '../reports/pdf';

const GOOGLE_FONTS_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet">`;

function buildHtmlForApi(title: string, bodyHtml: string): string {
  const base = buildPdfDocumentHtml(title, bodyHtml, { autoPrint: false });
  return base.replace('</head>', `${GOOGLE_FONTS_LINK}\n</head>`);
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s\-().]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 100)
    .concat('.pdf');
}

export async function downloadPdf(
  title: string,
  bodyHtml: string,
  filename?: string
): Promise<void> {
  const html = buildHtmlForApi(title, bodyHtml);
  const safeFilename = sanitizeFilename(filename ?? title);

  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, filename: safeFilename })
  });

  if (!response.ok) {
    let message = 'PDF generation failed.';
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadPdfWithFallback(
  title: string,
  bodyHtml: string,
  filename?: string
): Promise<void> {
  try {
    await downloadPdf(title, bodyHtml, filename);
  } catch {
    openPdfDocument(title, bodyHtml);
  }
}
