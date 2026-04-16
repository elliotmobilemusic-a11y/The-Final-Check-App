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

const PDF_TEXT_REPAIRS: Array<[RegExp, string]> = [
  [/\band\s+follow\s*-\s*up\b/gi, 'and Follow-Up'],
  [/\bfollow\s*-\s*up\b/gi, 'Follow-Up'],
  [/\boperational\s+findings\b/gi, 'Operational Findings'],
  [/\bcommercial\s+snapshot\b/gi, 'Commercial Snapshot'],
  [/\bseal\s+bay\s+resort\b/gi, 'Seal Bay Resort'],
  [/\bordering\b/gi, 'ordering'],
  [/\binconsistencies\b/gi, 'inconsistencies'],
  [/\bindicating\b/gi, 'indicating'],
  [/\bintentionally\b/gi, 'intentionally']
];

function normalizePdfText(value: unknown): string {
  let text = String(value ?? '')
    .replace(/[\u00A0\u2000-\u200D\u202F\u205F\u3000]/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b(and|or|of|for|to|the|with|by|in|on|at|via|vs)(?=[A-Z])/g, '$1 ')
    .replace(/([A-Za-z])\/([A-Za-z])/g, '$1 / $2')
    .replace(/_/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  for (const [pattern, replacement] of PDF_TEXT_REPAIRS) {
    text = text.replace(pattern, replacement);
  }

  return text
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

export function humanizeTitle(value: unknown): string {
  return normalizePdfText(value);
}

export function humanizeSentence(value: unknown): string {
  return normalizePdfText(value);
}

export function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}
