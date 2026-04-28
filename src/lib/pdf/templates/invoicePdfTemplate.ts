import type { Content, TableCell } from 'pdfmake/interfaces';
import { invoiceTotal } from '../../../features/clients/clientExports';
import type { ClientInvoice, ClientProfile } from '../../../types';
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

type InvoicePdfTemplateOptions = {
  client: ClientProfile;
  invoice: ClientInvoice;
  preparedBy?: string;
};

function invoiceSubtotal(invoice: ClientInvoice) {
  return invoice.lines.reduce(
    (sum, line) => sum + num(line.quantity) * num(line.unitPrice),
    0
  );
}

function invoiceLineRows(invoice: ClientInvoice): TableCell[][] {
  return invoice.lines.map((line) => {
    const descriptionCell: TableCell = {
      stack: [
        { text: pdfText(line.description, 'Untitled line') },
        line.type ? { text: line.type, style: 'small', margin: [0, 2, 0, 0] } : undefined
      ].filter(Boolean) as Content[]
    };

    return [
      descriptionCell,
      { text: String(num(line.quantity)), alignment: 'right' } as TableCell,
      { text: pdfCurrency(num(line.unitPrice)), alignment: 'right' } as TableCell,
      { text: pdfCurrency(num(line.quantity) * num(line.unitPrice)), alignment: 'right' } as TableCell
    ];
  });
}

export function buildInvoicePdfTemplate({
  client,
  invoice,
  preparedBy = 'Jason Wardill / The Final Check'
}: InvoicePdfTemplateOptions): PdfTemplateResult {
  const subtotal = invoiceSubtotal(invoice);
  const taxRate = num(invoice.taxRate);
  const taxAmount = invoice.taxEnabled ? subtotal * (taxRate / 100) : 0;
  const total = invoiceTotal(invoice);
  const clientName = pdfText(client.companyName, 'Client');
  const title = invoice.number || 'Invoice';
  const billingName = client.data.billingName || client.companyName || 'Client';
  const billingEmail = client.data.billingEmail || client.contactEmail || '';
  const billingAddress = client.data.billingAddress || '';
  const location = client.location || client.data.sites[0]?.name || client.data.sites[0]?.address || '';

  const content: Content[] = [
    documentHero({
      eyebrow: 'Invoice',
      title,
      subtitle: `${clientName} | ${pdfText(invoice.title, 'Consultancy services')}`,
      meta: [
        { label: 'Status', value: invoice.status },
        { label: 'Prepared by', value: preparedBy },
        { label: 'Issue date', value: pdfDate(invoice.issueDate) },
        { label: 'Due date', value: pdfDate(invoice.dueDate) }
      ]
    }),

    labelValueGrid([
      { label: 'Client', value: clientName },
      { label: 'Site / location', value: pdfText(location, 'Account level') },
      { label: 'Invoice number', value: pdfText(invoice.number, 'Draft invoice') },
      { label: 'Related quote', value: pdfText(invoice.sourceQuoteTitle || invoice.quoteReference || invoice.sourceQuoteId) },
      { label: 'Payment terms', value: `${invoice.paymentTermsDays || client.data.paymentTermsDays || 30} days` },
      { label: 'Total due', value: pdfCurrency(total) }
    ]),

    sectionTitle('Billing Details'),
    twoColumnSection(
      [
        { text: 'Bill To', style: 'label', margin: [0, 0, 0, 4] },
        paragraph(billingName),
        billingEmail ? paragraph(billingEmail) : emptyParagraph('Billing email not recorded'),
        billingAddress ? paragraph(billingAddress) : emptyParagraph('Billing address not recorded')
      ],
      [
        { text: 'Invoice Timing', style: 'label', margin: [0, 0, 0, 4] },
        paragraph(`Issued ${pdfDate(invoice.issueDate)}`),
        paragraph(`Due ${pdfDate(invoice.dueDate)}`),
        paragraph(`Payment status: ${invoice.status}`)
      ]
    ),

    sectionTitle('Invoice Lines'),
    invoice.lines.length
      ? pdfTable(
          ['*', 46, 74, 82],
          ['Description', 'Qty', 'Unit price', 'Line total'],
          invoiceLineRows(invoice)
        )
      : emptyParagraph('No invoice line items recorded.'),

    totalsTable([
      { label: 'Subtotal', value: pdfCurrency(subtotal) },
      invoice.taxEnabled
        ? { label: `VAT / tax (${taxRate}%)`, value: pdfCurrency(taxAmount) }
        : { label: 'VAT / tax', value: 'Not applied' },
      { label: 'Total due', value: pdfCurrency(total), emphasis: true }
    ]),

    sectionTitle('Notes'),
    pdfOptionalText(invoice.notes)
      ? paragraph(invoice.notes)
      : emptyParagraph('No invoice notes recorded.')
  ];

  return {
    filename: buildPdfFilename('Invoice', clientName, invoice.issueDate),
    documentDefinition: createPdfDocumentDefinition({
      title: `${title} | ${clientName}`,
      subject: 'Invoice PDF',
      preparedBy,
      content
    })
  };
}
