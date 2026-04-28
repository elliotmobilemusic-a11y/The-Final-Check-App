import type { Content, TableCell } from 'pdfmake/interfaces';
import type { AuditFormState } from '../../../types';
import { fmtPercent, num } from '../../utils';
import {
  buildPdfFilename,
  pdfDate,
  pdfOptionalText,
  pdfText
} from '../pdfFormatters';
import {
  createPdfDocumentDefinition,
  documentHero,
  emptyParagraph,
  labelValueGrid,
  paragraph,
  pdfTable,
  sectionTitle,
  twoColumnSection
} from '../pdfStyles';
import type { PdfTemplateResult } from '../pdfTypes';

type KitchenAuditPdfTemplateOptions = {
  audit: AuditFormState;
  preparedBy?: string;
};

export function buildKitchenAuditPdfTemplate({
  audit,
  preparedBy = 'Jason Wardill / The Final Check'
}: KitchenAuditPdfTemplateOptions): PdfTemplateResult {
  const clientName = pdfText(audit.businessName, 'Client');
  const title = 'Kitchen Performance Audit';

  const overallScore = Object.values(audit.categoryScores ?? {}).reduce((sum, cat: any) => sum + num(cat.score), 0) / Math.max(1, Object.keys(audit.categoryScores ?? {}).length);

  const categoryScoreRows = Object.entries(audit.categoryScores ?? {}).map(([key, cat]: [string, any]): TableCell[] => [
    pdfText(cat.label || key, key),
    { text: `${fmtPercent(cat.score || 0)}`, alignment: 'right' },
    (cat.score || 0) >= 0.7 ? { text: 'Good', alignment: 'right', color: '#2e7d32' } :
    (cat.score || 0) >= 0.5 ? { text: 'Moderate', alignment: 'right', color: '#ed6c02' } :
    { text: 'Attention', alignment: 'right', color: '#d32f2f' }
  ]);

  const content: Content[] = [
    documentHero({
      eyebrow: 'Audit Report',
      title,
      subtitle: `${clientName} | Operational performance assessment`,
      meta: [
        { label: 'Audit date', value: pdfDate(audit.visitDate) },
        { label: 'Auditor', value: preparedBy },
        { label: 'Overall score', value: `${fmtPercent(overallScore)}` },
        { label: 'Audit version', value: audit.id ? audit.id.slice(0, 8) : 'Draft' }
      ]
    }),

    labelValueGrid([
      { label: 'Business', value: clientName },
      { label: 'Location', value: pdfText(audit.location, 'On-site') },
      { label: 'Audit type', value: 'Kitchen Performance Audit' },
      { label: 'Completion', value: 'Calculated' }
    ]),

    sectionTitle('Category Scores'),
    pdfTable(
      ['*', 60, 80],
      ['Category', 'Score', 'Status'],
      categoryScoreRows
    ),

    sectionTitle('Executive Summary'),
    pdfOptionalText(audit.summary || '')
      ? paragraph(audit.summary)
      : emptyParagraph('No executive summary recorded.'),

    sectionTitle('Key Findings'),
    pdfOptionalText(audit.quickWins || '')
      ? paragraph(audit.quickWins)
      : emptyParagraph('No key findings recorded.'),

    sectionTitle('Recommendations'),
    pdfOptionalText(audit.priorityActions || '')
      ? paragraph(audit.priorityActions)
      : emptyParagraph('No recommendations recorded.'),

    sectionTitle('Priority Action Items'),
    audit.actionItems?.length
      ? audit.actionItems.map((item: any, index) => paragraph(`${index + 1}. ${item.title || item.description || 'Action item'}${item.dueDate ? ` (Target: ${item.dueDate})` : ''}`))
      : emptyParagraph('No priority action items recorded.'),
  ];

  return {
    filename: buildPdfFilename('Kitchen Audit', clientName, audit.visitDate),
    documentDefinition: createPdfDocumentDefinition({
      title: `${title} | ${clientName}`,
      subject: 'Kitchen Performance Audit Report',
      preparedBy,
      content
    })
  };
}