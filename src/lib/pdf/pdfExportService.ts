import type { TDocumentDefinitions, TVirtualFileSystem } from 'pdfmake/interfaces';
import type { PdfExportOptions, PdfExportResult, PdfTemplateResult } from './pdfTypes';

type PdfMakeApi = typeof import('pdfmake/build/pdfmake');
type PdfMakeModule = PdfMakeApi & { default?: PdfMakeApi };
type PdfFontsModule = TVirtualFileSystem & { default?: TVirtualFileSystem };

let pdfMakeApi: PdfMakeApi | null = null;

async function loadPdfMake() {
  if (pdfMakeApi) return pdfMakeApi;

  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake') as Promise<PdfMakeModule>,
    import('pdfmake/build/vfs_fonts') as Promise<PdfFontsModule>
  ]);

  const nextPdfMake = pdfMakeModule.default ?? pdfMakeModule;
  const vfs = pdfFontsModule.default ?? pdfFontsModule;

  nextPdfMake.addVirtualFileSystem(vfs);
  pdfMakeApi = nextPdfMake;

  return nextPdfMake;
}

export async function createPdfBlob(documentDefinition: TDocumentDefinitions) {
  const pdfMake = await loadPdfMake();
  return pdfMake.createPdf(documentDefinition).getBlob();
}

function openPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup) {
    window.location.assign(url);
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function downloadPdfBlob(blob: Blob, filename: string, fallbackToOpen: boolean) {
  if (typeof document === 'undefined') return false;

  const anchor = document.createElement('a');
  if (!('download' in anchor)) {
    if (fallbackToOpen) openPdfBlob(blob);
    return true;
  }

  const url = URL.createObjectURL(blob);
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);

  try {
    anchor.click();
    return false;
  } catch {
    if (fallbackToOpen) {
      openPdfBlob(blob);
      return true;
    }
    throw new Error('The PDF was created, but this browser blocked the download.');
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}

export async function exportPdfDocument(
  template: PdfTemplateResult,
  options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  const blob = await createPdfBlob(template.documentDefinition);
  const openedFallback = downloadPdfBlob(blob, template.filename, options.fallbackToOpen ?? true);

  return {
    blob,
    filename: template.filename,
    openedFallback
  };
}
