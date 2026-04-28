import type { Content, TableCell } from 'pdfmake/interfaces';
import { quoteServices } from '../../../features/quotes/config';
import type { ClientProfile, ClientQuote, QuoteLineItem } from '../../../types';
import { num } from '../../utils';
import {
  buildPdfFilename,
  pdfCurrency,
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
  totalsTable,
  twoColumnSection
} from '../pdfStyles';
import type { PdfTemplateResult } from '../pdfTypes';

type QuotePdfTemplateOptions = {
  client: ClientProfile;
  preparedBy?: string;
  quote: ClientQuote;
};

function quoteLines(quote: ClientQuote) {
  return quote.lineItems.length ? quote.lineItems : quote.calculation.finalLineItems;
}

function shownQuoteLineRows(lines: QuoteLineItem[]): TableCell[][] {
  return lines.map((line) => {
    const descriptionCell: TableCell = {
      stack: [
        { text: pdfText(line.label, 'Quote line') },
        line.description ? { text: line.description, style: 'small', margin: [0, 2, 0, 0] } : undefined
      ].filter(Boolean) as Content[]
    };

    return [
      descriptionCell,
      { text: String(num(line.quantity)), alignment: 'right' } as TableCell,
      { text: pdfCurrency(num(line.unitPrice)), alignment: 'right' } as TableCell,
      { text: pdfCurrency(num(line.total)), alignment: 'right' } as TableCell
    ];
  });
}

function hiddenQuoteLineRows(lines: QuoteLineItem[]): TableCell[][] {
  return lines.map((line) => {
    const descriptionCell: TableCell = {
      stack: [
        { text: pdfText(line.label, 'Quote line') },
        line.description ? { text: line.description, style: 'small', margin: [0, 2, 0, 0] } : undefined
      ].filter(Boolean) as Content[]
    };

    return [
      descriptionCell,
      { text: String(num(line.quantity)), alignment: 'right' } as TableCell,
      { text: 'Included in bespoke proposal', style: 'muted' } as TableCell
    ];
  });
}

export function buildQuotePdfTemplate({
  client,
  preparedBy = 'Jason Wardill / The Final Check',
  quote
}: QuotePdfTemplateOptions): PdfTemplateResult {
  const clientName = pdfText(quote.clientName || client.companyName, 'Client');
  const title = quote.quoteTitle || 'Consultancy quote';
  const serviceLabel = quoteServices[quote.serviceType]?.label ?? quote.serviceType;
  const lines = quoteLines(quote);
  const finalPriceHidden = quote.calculation.finalPriceHidden;
  const location = quote.location || client.location || client.data.sites[0]?.name || '';
  const calculation = quote.calculation;

  const pricingBlock: Content = finalPriceHidden
    ? {
        margin: [0, 12, 0, 0],
        table: {
          widths: ['*'],
          body: [[{
            text: quote.renderedSummary.externalPriceLabel || 'Price intentionally hidden for bespoke presentation.',
            bold: true,
            color: '#151a20',
            fillColor: '#fbf8f2',
            margin: [8, 8, 8, 8]
          } as TableCell]]
        },
        layout: {
          hLineColor: () => '#d9cfbe',
          vLineColor: () => '#d9cfbe'
        }
      }
    : totalsTable([
        { label: 'Suggested subtotal', value: pdfCurrency(calculation.suggestedSubtotal) },
        calculation.appliedDiscountAmount
          ? { label: 'Discounts', value: `-${pdfCurrency(calculation.appliedDiscountAmount)}` }
          : { label: 'Discounts', value: 'Not applied' },
        calculation.adjustmentAmount
          ? { label: 'Adjustments', value: pdfCurrency(calculation.adjustmentAmount) }
          : { label: 'Adjustments', value: 'Not applied' },
        calculation.overrideTotal !== null
          ? { label: 'Manual override total', value: pdfCurrency(calculation.overrideTotal) }
          : { label: 'Final total before VAT', value: pdfCurrency(calculation.finalTotal) },
        calculation.taxEnabled
          ? { label: `VAT / tax (${num(calculation.taxRate)}%)`, value: pdfCurrency(calculation.taxAmount) }
          : { label: 'VAT / tax', value: 'Not applied' },
        { label: 'Final total', value: pdfCurrency(calculation.totalWithTax), emphasis: true }
      ]);

  const acceptanceContent: Content[] = [
    { text: 'Acceptance', style: 'label', margin: [0, 0, 0, 4] },
    paragraph('To proceed, please confirm approval in writing so The Final Check can schedule the agreed work.')
  ];

  if (quote.linkedInvoiceId) {
    acceptanceContent.push(paragraph('This quote is linked to an invoice draft in the client record.'));
  }

  const content: Content[] = [
    documentHero({
      eyebrow: 'Quote',
      title,
      subtitle: `${clientName} | ${serviceLabel}`,
      meta: [
        { label: 'Status', value: quote.status },
        { label: 'Prepared by', value: preparedBy || quote.consultantName },
        { label: 'Quote date', value: pdfDate(quote.quoteDate) },
        { label: 'Valid until', value: pdfDate(quote.validUntil) }
      ]
    }),

    labelValueGrid([
      { label: 'Client', value: clientName },
      { label: 'Site / location', value: pdfText(location, 'Account level') },
      { label: 'Quote reference', value: quote.quoteId },
      { label: 'Service type', value: serviceLabel },
      { label: 'Consultant', value: pdfText(quote.consultantName || preparedBy) },
      {
        label: 'Pricing display',
        value: finalPriceHidden ? 'Price intentionally hidden for bespoke presentation' : pdfCurrency(calculation.totalWithTax)
      }
    ]),

    sectionTitle('Scope Summary'),
    pdfOptionalText(quote.scopeSummary)
      ? paragraph(quote.scopeSummary)
      : emptyParagraph('No scope summary recorded.'),

    sectionTitle('Line Items'),
    lines.length
      ? finalPriceHidden
        ? pdfTable(
            ['*', 48, 150],
            ['Description', 'Qty', 'Pricing'],
            hiddenQuoteLineRows(lines)
          )
        : pdfTable(
            ['*', 46, 74, 82],
            ['Description', 'Qty', 'Unit price', 'Line total'],
            shownQuoteLineRows(lines)
          )
      : emptyParagraph('No quote line items recorded.'),

    pricingBlock,

    sectionTitle('Notes And Acceptance'),
    twoColumnSection(
      [
        { text: 'Client Notes', style: 'label', margin: [0, 0, 0, 4] },
        pdfOptionalText(quote.clientFacingNotes)
          ? paragraph(quote.clientFacingNotes)
          : emptyParagraph('No client-facing notes recorded.')
      ],
      acceptanceContent
    )
  ];

  return {
    filename: buildPdfFilename('Quote', clientName, quote.quoteDate),
    documentDefinition: createPdfDocumentDefinition({
      title: `${title} | ${clientName}`,
      subject: 'Quote PDF',
      preparedBy,
      content
    })
  };
}
