import type { QuestionnaireTemplate } from '../../types';

const profitAuditTemplate: QuestionnaireTemplate = {
  id: 'profit_audit',
  label: 'Profit Audit Pre-Visit',
  description:
    'Gather key operational and financial data before a Kitchen Profit Audit site visit.',
  groups: [
    {
      title: 'Business Details',
      fields: [
        { key: 'businessName', label: 'Business name', type: 'text', required: true },
        { key: 'siteName', label: 'Site name', type: 'text', placeholder: 'If different from business name' },
        {
          key: 'siteAddress',
          label: 'Site address',
          type: 'text',
          fullWidth: true,
          placeholder: 'Full address including postcode'
        },
        {
          key: 'businessType',
          label: 'Business type',
          type: 'select',
          options: [
            'Restaurant',
            'Pub / Bar',
            'Hotel',
            'Café',
            'Takeaway',
            'Contract catering',
            'Events / hospitality',
            'Other'
          ]
        }
      ]
    },
    {
      title: 'Contact Details',
      fields: [
        { key: 'contactName', label: 'Main contact name', type: 'text', required: true },
        { key: 'contactRole', label: 'Contact role', type: 'text', placeholder: 'Owner, GM, Head Chef…' },
        { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
        { key: 'contactPhone', label: 'Contact phone', type: 'tel' }
      ]
    },
    {
      title: 'Operational Numbers',
      fields: [
        {
          key: 'weeklySales',
          label: 'Approximate weekly food & drink sales (£)',
          type: 'number',
          placeholder: '0'
        },
        {
          key: 'coversPerWeek',
          label: 'Covers per week',
          type: 'number',
          placeholder: '0'
        },
        {
          key: 'averageSpend',
          label: 'Average spend per head (£)',
          type: 'number',
          placeholder: '0.00'
        },
        {
          key: 'teamSize',
          label: 'Kitchen team size (headcount)',
          type: 'number',
          placeholder: '0'
        },
        {
          key: 'tradingDays',
          label: 'Trading days per week',
          type: 'select',
          options: ['5', '6', '7', 'Varies']
        },
        {
          key: 'mainSupplier',
          label: 'Main food supplier(s)',
          type: 'text',
          placeholder: 'Brakes, Bidfood, local…',
          fullWidth: true
        }
      ]
    },
    {
      title: 'Context',
      fields: [
        {
          key: 'foodConcept',
          label: 'Food concept / cuisine style',
          type: 'text',
          placeholder: 'Modern British, gastropub, Italian…',
          fullWidth: true
        },
        {
          key: 'currentChallenges',
          label: 'Biggest current challenges',
          type: 'textarea',
          required: true,
          fullWidth: true,
          placeholder: 'Food cost creep, waste, labour, GP pressure, menu complexity…'
        },
        {
          key: 'goalsForVisit',
          label: 'Goals for this visit',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'What would a successful outcome look like?'
        },
        {
          key: 'extraNotes',
          label: 'Anything else we should know',
          type: 'textarea',
          fullWidth: true
        }
      ]
    }
  ]
};

const TEMPLATES: QuestionnaireTemplate[] = [profitAuditTemplate];

export function getQuestionnaireTemplate(id: string): QuestionnaireTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getTemplateGroups(): { id: string; label: string; description: string }[] {
  return TEMPLATES.map(({ id, label, description }) => ({ id, label, description }));
}
