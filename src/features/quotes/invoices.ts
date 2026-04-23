import { todayIso, uid } from '../../lib/utils';
import type { ClientInvoice, ClientInvoiceLine, ClientProfile, ClientQuote } from '../../types';

function buildInvoiceNumber(existingCount: number) {
  return `INV-${new Date().getFullYear()}-${String(existingCount + 1).padStart(3, '0')}`;
}

function buildDueDate(paymentTermsDays: number) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (paymentTermsDays || 30));
  return dueDate.toISOString().slice(0, 10);
}

function mapQuoteLineToInvoiceLine(line: ClientQuote['lineItems'][number]): ClientInvoiceLine {
  return {
    id: uid('invoice-line'),
    description: line.description ? `${line.label} — ${line.description}` : line.label,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    sourceQuoteLineItemId: line.id,
    type: line.type === 'discount' ? 'discount' : line.type === 'adjustment' ? 'adjustment' : 'service'
  };
}

export function createInvoiceDraftFromQuote(
  client: ClientProfile,
  quote: ClientQuote,
  existingInvoiceCount: number
): ClientInvoice {
  const paymentTermsDays = client.data.paymentTermsDays || 30;

  return {
    id: uid('invoice'),
    number: buildInvoiceNumber(existingInvoiceCount),
    title: quote.quoteTitle || 'Consultancy services',
    issueDate: todayIso(),
    dueDate: buildDueDate(paymentTermsDays),
    status: 'Draft',
    notes: quote.clientFacingNotes || quote.scopeSummary || '',
    lines: quote.lineItems.map(mapQuoteLineToInvoiceLine),
    taxEnabled: quote.calculation.taxEnabled,
    taxRate: quote.calculation.taxRate,
    paymentTermsDays,
    sourceQuoteId: quote.quoteId,
    sourceQuoteTitle: quote.quoteTitle,
    quoteReference: quote.quoteId
  };
}
