import type { TDocumentDefinitions } from 'pdfmake/interfaces';

export type PdfTemplateResult = {
  documentDefinition: TDocumentDefinitions;
  filename: string;
};

export type PdfExportResult = {
  blob: Blob;
  filename: string;
  openedFallback: boolean;
};

export type PdfExportOptions = {
  fallbackToOpen?: boolean;
};

export type PdfBaseDocumentOptions = {
  content: TDocumentDefinitions['content'];
  title: string;
  subject?: string;
  preparedBy?: string;
};
