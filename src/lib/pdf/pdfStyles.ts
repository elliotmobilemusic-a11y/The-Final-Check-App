import type {
  Content,
  ContentColumns,
  ContentStack,
  ContentTable,
  TDocumentDefinitions,
  TableCell
} from 'pdfmake/interfaces';
import type { PdfBaseDocumentOptions } from './pdfTypes';

const brand = {
  name: 'The Final Check',
  tagline: 'Hospitality consultancy',
  footer: 'The Final Check | Jason Wardill | Hospitality consultancy'
};

export function createPdfDocumentDefinition({
  content,
  title,
  subject,
  preparedBy = 'Jason Wardill / The Final Check'
}: PdfBaseDocumentOptions): TDocumentDefinitions {
  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    pageMargins: [40, 82, 40, 68],
    info: {
      title,
      subject: subject || title,
      author: 'The Final Check',
      creator: 'The Final Check App',
      producer: 'The Final Check App'
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 9.5,
      lineHeight: 1.25,
      color: '#1e252d'
    },
    styles: {
      eyebrow: {
        fontSize: 8,
        bold: true,
        color: '#9a692f',
        characterSpacing: 1.1,
        margin: [0, 0, 0, 5]
      },
      documentTitle: {
        fontSize: 24,
        bold: true,
        color: '#151a20',
        margin: [0, 0, 0, 6]
      },
      documentSubtitle: {
        fontSize: 10,
        color: '#5d6875',
        margin: [0, 0, 0, 0]
      },
      sectionTitle: {
        fontSize: 13,
        bold: true,
        color: '#151a20',
        margin: [0, 18, 0, 8]
      },
      label: {
        fontSize: 7.5,
        bold: true,
        color: '#6d7480',
        characterSpacing: 0.6
      },
      value: {
        fontSize: 10,
        color: '#1f2730'
      },
      muted: {
        color: '#667281'
      },
      small: {
        fontSize: 8,
        color: '#667281'
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: '#6f4d24'
      },
      totalLabel: {
        bold: true,
        color: '#29313b'
      },
      totalValue: {
        bold: true,
        color: '#151a20'
      }
    },
    header: () => ({
      margin: [40, 26, 40, 0],
      columns: [
        {
          stack: [
            { text: brand.name, bold: true, fontSize: 14, color: '#151a20' },
            { text: brand.tagline, fontSize: 8, color: '#9a692f', characterSpacing: 0.8 }
          ]
        },
        {
          text: preparedBy,
          alignment: 'right',
          fontSize: 8,
          color: '#667281',
          margin: [0, 5, 0, 0]
        }
      ]
    }),
    footer: (currentPage, pageCount) => ({
      margin: [40, 0, 40, 24],
      columns: [
        { text: brand.footer, fontSize: 8, color: '#7b838e' },
        {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'right',
          fontSize: 8,
          color: '#7b838e'
        }
      ]
    }),
    content
  };
}

export function documentHero(options: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
}): ContentStack {
  const meta = options.meta?.length
    ? {
        margin: [0, 14, 0, 0],
        columns: options.meta.map((item) => labelValueBlock(item.label, item.value))
      }
    : undefined;

  return {
    stack: [
      { text: options.eyebrow.toUpperCase(), style: 'eyebrow' },
      { text: options.title, style: 'documentTitle' },
      options.subtitle ? { text: options.subtitle, style: 'documentSubtitle' } : undefined,
      meta
    ].filter(Boolean) as Content[]
  };
}

export function sectionTitle(title: string): Content {
  return { text: title, style: 'sectionTitle' };
}

export function labelValueBlock(label: string, value: string): ContentStack {
  return {
    stack: [
      { text: label.toUpperCase(), style: 'label' },
      { text: value, style: 'value', margin: [0, 3, 8, 0] }
    ]
  };
}

export function labelValueGrid(items: Array<{ label: string; value: string }>): ContentTable {
  const rows: TableCell[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    const left = items[index];
    const right = items[index + 1];
    rows.push([
      boxedLabelValue(left.label, left.value),
      right ? boxedLabelValue(right.label, right.value) : { text: '', border: [false, false, false, false] }
    ]);
  }

  return {
    table: {
      widths: ['*', '*'],
      body: rows
    },
    layout: {
      hLineColor: () => '#d9dfe5',
      vLineColor: () => '#d9dfe5',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 7,
      paddingBottom: () => 7
    },
    margin: [0, 14, 0, 0]
  };
}

export function boxedLabelValue(label: string, value: string): TableCell {
  return {
    stack: [
      { text: label.toUpperCase(), style: 'label' },
      { text: value, style: 'value', margin: [0, 3, 0, 0] }
    ],
    fillColor: '#fbfcfd'
  };
}

export function twoColumnSection(left: Content, right: Content): ContentColumns {
  return {
    columns: [
      { width: '*', stack: Array.isArray(left) ? left : [left] },
      { width: '*', stack: Array.isArray(right) ? right : [right] }
    ],
    columnGap: 16
  };
}

export function paragraph(text: string): Content {
  return {
    text,
    margin: [0, 0, 0, 6],
    color: '#29313b'
  };
}

export function emptyParagraph(text = 'Not recorded'): Content {
  return {
    text,
    italics: true,
    color: '#667281',
    margin: [0, 0, 0, 6]
  };
}

export function pdfTable(
  widths: ContentTable['table']['widths'],
  headers: string[],
  rows: TableCell[][]
): ContentTable {
  return {
    table: {
      headerRows: 1,
      widths,
      body: [
        headers.map((header) => ({
          text: header.toUpperCase(),
          style: 'tableHeader',
          fillColor: '#f5efe6'
        })),
        ...rows
      ]
    },
    layout: {
      hLineColor: () => '#d9dfe5',
      vLineColor: () => '#e7ebef',
      paddingLeft: () => 7,
      paddingRight: () => 7,
      paddingTop: () => 6,
      paddingBottom: () => 6
    },
    margin: [0, 2, 0, 0]
  };
}

export function totalsTable(rows: Array<{ label: string; value: string; emphasis?: boolean }>): ContentTable {
  return {
    table: {
      widths: ['*', 120],
      body: rows.map((row) => [
        {
          text: row.label,
          alignment: 'right',
          style: row.emphasis ? 'totalLabel' : 'value',
          border: [false, false, false, false]
        },
        {
          text: row.value,
          alignment: 'right',
          style: row.emphasis ? 'totalValue' : 'value',
          border: [false, false, false, false]
        }
      ])
    },
    margin: [0, 12, 0, 0]
  };
}
