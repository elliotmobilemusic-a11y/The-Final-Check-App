import PDF_REPORT_CSS from './pdf-report.css?raw';

export type PdfDocumentOptions = {
  landscape?: boolean;
  autoPrint?: boolean;
  showCloseButton?: boolean;
  formatLabel?: string;
};

export function buildPdfDocumentHtml(
  title: string,
  bodyHtml: string,
  options: PdfDocumentOptions = {}
): string {
  const safeTitle = escapeHtml(title);
  const pageSize = options.landscape ? 'A4 landscape' : 'A4';
  const showCloseButton = options.showCloseButton ?? true;
  const autoPrint = options.autoPrint ?? false;
  const formatLabel = options.formatLabel ?? 'Client-ready PDF';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
${PDF_REPORT_CSS}
    </style>
  </head>
  <body>
    <main class="pdf-document">
      ${bodyHtml}
    </main>

    ${
      autoPrint
        ? `<script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          try {
            window.focus();
            window.print();
          } catch (error) {
            console.error('Automatic print failed', error);
          }
        }, 350);
      });
    </script>`
        : ''
    }
  </body>
</html>`;
}

export function openPdfDocument(
  title: string,
  bodyHtml: string,
  options: PdfDocumentOptions = {}
) {
  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    throw new Error('Enable pop-ups to export PDFs from this workspace.');
  }

  try {
    popup.opener = null;
  } catch {
    // Ignore browsers that prevent rewriting opener after opening the window.
  }

  popup.document.open();
  popup.document.write(
    buildPdfDocumentHtml(title, bodyHtml, {
      ...options,
      autoPrint: options.autoPrint ?? true
    })
  );
  popup.document.close();
  popup.focus();
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function humanizeTitle(value: unknown): string {
  return String(value ?? '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b(and|or|of|for|to|the|with|by|in|on|at|via|vs)([A-Z])/gi, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function humanizeSentence(value: unknown): string {
  return String(value ?? '')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b(and|or|of|for|to|the|with|by|in|on|at|via|vs)([A-Z])/gi, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}
