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
          label: 'Approximate weekly food sales (£)',
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
          key: 'labourPercent',
          label: 'Kitchen labour %',
          type: 'number',
          placeholder: '25'
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

const foodSafetyTemplate: QuestionnaireTemplate = {
  id: 'food_safety',
  label: 'Food Safety Pre-Visit',
  description:
    'Help us understand your current compliance position before a Food Safety Audit site visit.',
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
      title: 'Compliance Status',
      fields: [
        {
          key: 'hygieneRating',
          label: 'Current food hygiene rating',
          type: 'select',
          options: ['0', '1', '2', '3', '4', '5', 'Awaiting inspection', 'Not yet rated']
        },
        {
          key: 'lastEhoVisit',
          label: 'Date of last EHO visit',
          type: 'text',
          placeholder: 'Month and year, e.g. March 2024'
        },
        {
          key: 'haccpOrSfbb',
          label: 'Food safety management system in use',
          type: 'select',
          options: ['HACCP', 'Safer Food Better Business (SFBB)', 'Custom system', 'None in place', 'Unsure']
        },
        {
          key: 'allergenProcess',
          label: 'Allergen process currently in place',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'How do you capture, communicate, and verify allergens?'
        }
      ]
    },
    {
      title: 'Operational Standards',
      fields: [
        {
          key: 'temperatureChecks',
          label: 'Temperature checks completed daily?',
          type: 'select',
          options: ['Yes — recorded', 'Yes — not recorded', 'Inconsistent', 'No']
        },
        {
          key: 'deliveryChecks',
          label: 'Delivery checks completed?',
          type: 'select',
          options: ['Yes — recorded', 'Yes — not recorded', 'Inconsistent', 'No']
        },
        {
          key: 'cleaningSchedule',
          label: 'Cleaning schedule in place?',
          type: 'select',
          options: ['Yes — signed off daily', 'Yes — not consistently signed', 'No formal schedule']
        },
        {
          key: 'staffTraining',
          label: 'Staff food safety training status',
          type: 'select',
          options: ['All staff trained and up to date', 'Most staff trained', 'Some gaps', 'Training overdue', 'Unsure']
        }
      ]
    },
    {
      title: 'Context',
      fields: [
        {
          key: 'recentIncidents',
          label: 'Any recent food safety incidents or complaints?',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'e.g. EHO improvement notice, customer complaint, near-miss…'
        },
        {
          key: 'prioritiesForVisit',
          label: 'Priority areas for this visit',
          type: 'textarea',
          required: true,
          fullWidth: true,
          placeholder: 'What are the biggest gaps or concerns you want addressed?'
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

const mysteryShopTemplate: QuestionnaireTemplate = {
  id: 'mystery_shop',
  label: 'Mystery Shop Pre-Visit',
  description:
    'Share key context about your operation so we can calibrate the mystery shop visit correctly.',
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
        { key: 'contactRole', label: 'Contact role', type: 'text', placeholder: 'Owner, GM, Floor Manager…' },
        { key: 'contactEmail', label: 'Contact email', type: 'email', required: true },
        { key: 'contactPhone', label: 'Contact phone', type: 'tel' }
      ]
    },
    {
      title: 'Service Context',
      fields: [
        {
          key: 'serviceStyle',
          label: 'Service style',
          type: 'select',
          options: [
            'Full table service',
            'Counter / order at bar',
            'Mixed (table and counter)',
            'Fast casual',
            'Fine dining'
          ]
        },
        {
          key: 'targetCustomer',
          label: 'Target customer',
          type: 'text',
          placeholder: 'e.g. local families, business diners, weekend leisure…',
          fullWidth: true
        },
        {
          key: 'keyServiceStandards',
          label: 'Key service standards you expect staff to deliver',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'e.g. greeting within 60 seconds, checking back after starters…'
        },
        {
          key: 'greetingAndFlow',
          label: 'Expected greeting and service flow',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Walk us through what a good service experience looks like for your venue…'
        }
      ]
    },
    {
      title: 'Service Expectations',
      fields: [
        {
          key: 'upsellExpectations',
          label: 'Upselling and recommendation expectations',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'e.g. specials board, wine pairing, dessert upsell…'
        },
        {
          key: 'complaintHandling',
          label: 'Complaint handling approach',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'How should staff handle a complaint or dissatisfied guest?'
        }
      ]
    },
    {
      title: 'Focus Areas',
      fields: [
        {
          key: 'painPoints',
          label: 'Known pain points or weak spots',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'What do you already know isn\'t working as well as it should?'
        },
        {
          key: 'areasToReview',
          label: 'Specific areas to review during the visit',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'e.g. kitchen communication, bar handover, floor manager presence…'
        },
        {
          key: 'prioritiesForVisit',
          label: 'Priority outcomes for this mystery shop',
          type: 'textarea',
          required: true,
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

const menuProfitTemplate: QuestionnaireTemplate = {
  id: 'menu_profit',
  label: 'Menu Profit Engine Pre-Visit',
  description:
    'Share your menu structure and trading data so we can prepare a focused Menu Profit Engine analysis.',
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
      title: 'Menu Numbers',
      fields: [
        {
          key: 'weeklySales',
          label: 'Approximate weekly food sales (£)',
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
          key: 'menuSize',
          label: 'Number of dishes on the menu',
          type: 'number',
          placeholder: '0'
        },
        {
          key: 'targetGp',
          label: 'Target gross profit % on food',
          type: 'number',
          placeholder: '65'
        }
      ]
    },
    {
      title: 'Menu Analysis',
      fields: [
        {
          key: 'strongestSellers',
          label: 'Strongest selling dishes',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'List the dishes that sell most consistently…'
        },
        {
          key: 'weakestSellers',
          label: 'Weakest or slowest dishes',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Which dishes rarely sell or feel like dead weight?'
        },
        {
          key: 'gpConcerns',
          label: 'GP concerns or known problem dishes',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Which dishes feel underpriced or have high food cost?'
        },
        {
          key: 'pricingConcerns',
          label: 'Pricing concerns',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Are there dishes you feel reluctant to price correctly? Why?'
        }
      ]
    },
    {
      title: 'Context',
      fields: [
        {
          key: 'supplierCostIssues',
          label: 'Supplier cost pressures',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Any ingredients that have increased significantly in cost recently?'
        },
        {
          key: 'menuComplexity',
          label: 'Menu complexity or kitchen concerns',
          type: 'textarea',
          fullWidth: true,
          placeholder: 'Are there dishes that are difficult to execute consistently or slow the kitchen?'
        },
        {
          key: 'visitGoals',
          label: 'Goals for this visit',
          type: 'textarea',
          required: true,
          fullWidth: true,
          placeholder: 'What would a successful Menu Profit Engine review deliver for you?'
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

const TEMPLATES: QuestionnaireTemplate[] = [
  profitAuditTemplate,
  foodSafetyTemplate,
  mysteryShopTemplate,
  menuProfitTemplate
];

export function getQuestionnaireTemplate(id: string): QuestionnaireTemplate | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getTemplateGroups(): { id: string; label: string; description: string }[] {
  return TEMPLATES.map(({ id, label, description }) => ({ id, label, description }));
}
