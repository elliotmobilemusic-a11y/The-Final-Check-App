export type HelpField = {
  label: string;
  guidance: string;
};

export type HelpSection = {
  title: string;
  purpose: string;
  steps?: string[];
  fields?: HelpField[];
};

export type AppHelpPage = {
  key: 'login' | 'dashboard' | 'clients' | 'client-profile' | 'audit' | 'menu' | 'not-found';
  title: string;
  routeLabel: string;
  summary: string;
  quickStart: string[];
  sections: HelpSection[];
  tips: string[];
  prompts: string[];
};

type HelpEntry = {
  page: AppHelpPage;
  title: string;
  body: string;
  section?: HelpSection;
  field?: HelpField;
};

const helpPages: AppHelpPage[] = [
  {
    key: 'login',
    title: 'Login',
    routeLabel: 'Sign in',
    summary:
      'Use the login page to enter the workspace with your approved email and password. Once you are signed in, the app takes you into the consultancy operating system.',
    quickStart: [
      'Enter the approved email address connected to your workspace.',
      'Enter the password for that account and submit the form.',
      'If sign-in works, you are taken into the protected area and can start using clients, audits, and menu work.'
    ],
    sections: [
      {
        title: 'Sign-in form',
        purpose: 'This form only exists to start a secure session.',
        fields: [
          {
            label: 'Email',
            guidance:
              'Use the same approved email that should own the saved clients, audits, and menu projects.'
          },
          {
            label: 'Password',
            guidance:
              'Enter the current password for that account. Password issues are usually account-side rather than form-side.'
          }
        ]
      },
      {
        title: 'After login',
        purpose: 'The app remembers the active session so you can move around the workspace without signing in again.',
        steps: [
          'Check the top bar to confirm the correct account email is showing.',
          'Start on the dashboard if you want a full overview, or jump straight into clients, audit, or menu work.'
        ]
      }
    ],
    tips: [
      'If login fails, double-check the email first because saved work is tied to the signed-in user.',
      'Use the dashboard after login when you want the fastest overview of open work and recent updates.'
    ],
    prompts: [
      'How do I sign in?',
      'What happens after I log in?',
      'Where should I start once I am in the app?'
    ]
  },
  {
    key: 'dashboard',
    title: 'Dashboard',
    routeLabel: 'Overview',
    summary:
      'The dashboard is the command centre for the whole app. It shows current clients, recent activity, follow-up pressure points, and the quickest route into the next useful piece of work.',
    quickStart: [
      'Check the top summary cards and operations board to see overall workload and health.',
      'Use recent activity and spotlight sections to jump straight into a client, audit, or menu project.',
      'Use the follow-up queue to decide what needs attention next.'
    ],
    sections: [
      {
        title: 'Operations board',
        purpose:
          'This is the quickest high-level read on active clients, linked workstreams, tasks, reviews, and system activity.'
      },
      {
        title: 'Command centre and system health',
        purpose:
          'These blocks tell you if the workspace is set up well or if there are gaps like unlinked work, inactive clients, or missing follow-up.'
      },
      {
        title: 'Recent activity',
        purpose:
          'Use this list when you want to continue from the latest saved audit, menu project, or client update instead of browsing manually.',
        steps: [
          'Open the newest item if you are resuming existing work.',
          'Use the label to understand whether the item is a client, audit, or menu workflow.'
        ]
      },
      {
        title: 'Client spotlight and follow-up queue',
        purpose:
          'These sections help you prioritise relationships, overdue reviews, open tasks, and accounts with the most live work.'
      }
    ],
    tips: [
      'Use the dashboard to choose what to do next, not to enter detailed data.',
      'If you see clients with no workstreams, create or link an audit or menu review from the relevant page.'
    ],
    prompts: [
      'How should I use the dashboard each day?',
      'What is the operations board for?',
      'How do I decide what to work on next from here?'
    ]
  },
  {
    key: 'clients',
    title: 'Clients',
    routeLabel: 'Client CRM',
    summary:
      'The clients page is the front desk of the CRM. Use it to create new accounts at the top, then filter, sort, review, export, and open the full client profile from the live portfolio list underneath.',
    quickStart: [
      'Create a new client at the top before starting linked audits or menu projects.',
      'Use portfolio controls to search, filter by status, and sort by urgency or value.',
      'Open a client profile when you need full CRM, invoice, timeline, and delivery detail.'
    ],
    sections: [
      {
        title: 'Add a new client',
        purpose:
          'Create the base CRM record before you start delivery work or billing.',
        fields: [
          {
            label: 'Company name',
            guidance: 'Use the trading name you want to recognise everywhere in the app and in exports.'
          },
          {
            label: 'Primary contact name',
            guidance: 'Add the main day-to-day contact or decision-maker for the account.'
          },
          {
            label: 'Primary contact email',
            guidance: 'Use the real working email for follow-up, billing, or relationship tracking.'
          },
          {
            label: 'Primary contact phone',
            guidance: 'Add the most useful direct number for quick contact.'
          },
          {
            label: 'Location',
            guidance: 'Use the main site or account location so the client is easy to recognise in lists.'
          },
          {
            label: 'Status',
            guidance: 'Set where the relationship currently sits such as Active, Prospect, Onboarding, or Inactive.'
          },
          {
            label: 'Tier',
            guidance: 'Use this for account priority or service level such as Standard, Growth, or Premium.'
          },
          {
            label: 'Industry',
            guidance: 'Describe the business type clearly so future reporting and filtering make sense.'
          },
          {
            label: 'Website',
            guidance: 'Add the live business website if it helps with reference or account context.'
          },
          {
            label: 'Next review date',
            guidance: 'Use the next meaningful account review date so the CRM can show urgency.'
          },
          {
            label: 'Tags and notes',
            guidance: 'Use tags for searchable labels and notes for context that should travel with the account.'
          }
        ]
      },
      {
        title: 'Portfolio controls',
        purpose:
          'Search and narrow the long client list so you can run the CRM like an actual operating system.',
        fields: [
          {
            label: 'Search',
            guidance: 'Search by company, contact, location, industry, or tags.'
          },
          {
            label: 'Status filter',
            guidance: 'Use this to focus only on active clients, prospects, onboarding accounts, or inactive ones.'
          },
          {
            label: 'Sort',
            guidance: 'Choose the sort mode that best matches the decision you are making, such as updated, review date, value, or company.'
          }
        ]
      },
      {
        title: 'Client CRM list',
        purpose:
          'This is the operational list view for the whole portfolio. Use it to open a client, export their record, or remove an account when needed.'
      }
    ],
    tips: [
      'Create the client first so audits and menu projects can be linked cleanly.',
      'Use next review dates and tags to make follow-up more systematic.',
      'Export PDF from the list when you need a quick client pack without opening the full profile.'
    ],
    prompts: [
      'How do I add a client properly?',
      'What should I put in the new client form?',
      'How do I use the filters and sorting?'
    ]
  },
  {
    key: 'client-profile',
    title: 'Client Profile',
    routeLabel: 'Account workspace',
    summary:
      'The client profile is the full account workspace. Use it to manage relationship data, billing details, deals, contacts, tasks, timeline, invoices, and linked audits and menu projects.',
    quickStart: [
      'Complete the core profile and relationship sections first so the account is well-defined.',
      'Use CRM and billing controls to make invoicing and account management reliable.',
      'Use the lower sections for operational follow-up: deals, contacts, sites, timeline, tasks, and invoices.'
    ],
    sections: [
      {
        title: 'Core profile',
        purpose: 'Set the account identity and main reference details.',
        fields: [
          {
            label: 'Company name, location, industry, status, tier, website, review date',
            guidance:
              'These fields define how the account appears across the CRM and dashboard. Keep them current because they drive recognition and prioritisation.'
          },
          {
            label: 'Logo, cover, and notes',
            guidance:
              'Use these when you want richer account context. Notes should hold the broad account summary, not every task-level detail.'
          }
        ]
      },
      {
        title: 'Main relationship details',
        purpose: 'Capture the best internal view of the relationship.',
        fields: [
          {
            label: 'Account owner',
            guidance: 'Set the consultant or internal owner responsible for the account.'
          },
          {
            label: 'Lead source',
            guidance: 'Use the real origin of the account for commercial tracking.'
          },
          {
            label: 'Relationship health',
            guidance: 'Use Strong, Watch, or At Risk honestly so the CRM reflects reality.'
          },
          {
            label: 'Profile summary and internal notes',
            guidance:
              'Profile summary is the client-facing account snapshot. Internal notes are for private commercial or operational context.'
          }
        ]
      },
      {
        title: 'CRM and billing controls',
        purpose: 'Store the details needed for commercial management and invoice production.',
        fields: [
          {
            label: 'Estimated monthly value',
            guidance: 'Use a realistic value so the portfolio can be sorted and compared properly.'
          },
          {
            label: 'Billing name, billing email, billing address',
            guidance: 'Fill these in exactly as they should appear on invoices and exports.'
          },
          {
            label: 'Payment terms, VAT number, company number',
            guidance: 'Use these fields to make invoicing and collections cleaner.'
          }
        ]
      },
      {
        title: 'Goals, risks, and opportunities',
        purpose:
          'Use these lists to capture what the client wants, what could go wrong, and where value can be created.'
      },
      {
        title: 'Pipeline, contacts, sites, timeline, and tasks',
        purpose:
          'These sections turn the page into a working CRM rather than just a profile. Add only current, useful records and keep statuses honest.'
      },
      {
        title: 'Invoices and exports',
        purpose:
          'Build invoice drafts with line items, then export either the whole client record or a single invoice as a printable PDF.'
      }
    ],
    tips: [
      'Use this page as the source of truth for the account, not just a static profile.',
      'Keep tasks, timeline items, and deals current so the dashboard remains useful.',
      'Complete billing details before drafting serious invoices.'
    ],
    prompts: [
      'How do I fill in the client profile?',
      'What should go in CRM and billing controls?',
      'How do invoices work on this page?'
    ]
  },
  {
    key: 'audit',
    title: 'Audit Tool',
    routeLabel: 'Kitchen audit workspace',
    summary:
      'The audit tool is built to reduce onsite workload. It helps you capture the visit quickly, score the kitchen, generate actions, draft narrative, and export the audit as a printable client-ready report.',
    quickStart: [
      'Start with site details and trading profile so the report has the right context.',
      'Add commercial numbers and score the operation to expose the biggest risks.',
      'Use controls, findings, layout review, and action planning to turn the visit into a real follow-up plan.'
    ],
    sections: [
      {
        title: 'Site details',
        purpose: 'Set the identity of the audit and link it to the right client.',
        fields: [
          {
            label: 'Report title',
            guidance: 'Use a clear title that matches the kind of visit such as operational audit, margin recovery, or opening support.'
          },
          {
            label: 'Business name, location, visit date, consultant, site contact',
            guidance:
              'These should match the real visit details because they appear in the final report and saved record.'
          },
          {
            label: 'Client profile',
            guidance: 'Link the audit to the right client so it appears in that account history.'
          },
          {
            label: 'Audit type',
            guidance: 'Choose the closest type to the real engagement so the record and exported report stay clear.'
          }
        ]
      },
      {
        title: 'Trading and context profile',
        purpose: 'Describe the operating environment before you judge the kitchen.',
        fields: [
          {
            label: 'Service style, trading days, main supplier',
            guidance: 'These explain what kind of kitchen you are assessing and how it is supplied.'
          },
          {
            label: 'Covers per week and average spend',
            guidance: 'Use these when live weekly sales are unknown. The tool can estimate weekly sales from them.'
          },
          {
            label: 'Kitchen team size',
            guidance: 'Use the live operating headcount, not the theoretical target structure.'
          },
          {
            label: 'Allergen confidence, hygiene risk, equipment condition',
            guidance: 'Score these honestly because they directly affect the risk profile and suggested actions.'
          }
        ]
      },
      {
        title: 'Commercial snapshot',
        purpose: 'Capture the financial baseline behind the audit.',
        fields: [
          {
            label: 'Weekly food sales and weekly food cost',
            guidance: 'Use the most reliable current figures available. These drive actual GP and commercial opportunity.'
          },
          {
            label: 'Target GP',
            guidance: 'Set the realistic target you are measuring against, not a fantasy number.'
          },
          {
            label: 'Weekly waste and labour',
            guidance: 'Use actual observed or reported levels so the tool can reflect true pressure areas.'
          },
          {
            label: 'Ordering control',
            guidance: 'Choose Low, Moderate, or High based on how disciplined the purchasing system really is.'
          }
        ]
      },
      {
        title: 'Operational scorecard and controls',
        purpose:
          'Use the scorecard to grade the operation quickly, and the controls register to record whether the kitchen’s systems actually exist and are being used.',
        fields: [
          {
            label: 'Scorecard ratings',
            guidance:
              'Use 0 to 10 ratings based on what you saw during the visit. Score the kitchen as it operates now, not as it should operate.'
          },
          {
            label: 'Controls and evidence register',
            guidance:
              'Mark each control as In Place, Partial, Missing, or N/A. Add short notes that explain what evidence you saw or what was missing.'
          }
        ]
      },
      {
        title: 'Operational observations and findings',
        purpose:
          'This is where you turn the visit into clear evidence. Use observations for narrative and repeatable findings sections for specific losses or issues.',
        fields: [
          {
            label: 'Executive summary, leadership, food quality, systems',
            guidance:
              'Write concise, high-signal notes. Focus on what matters commercially and operationally rather than writing long generic paragraphs.'
          },
          {
            label: 'Waste, over-portioning, ordering findings',
            guidance:
              'Add separate records for each real issue so the action plan and report are specific instead of vague.'
          },
          {
            label: 'Layout review',
            guidance:
              'Describe strengths, issues, equipment needs, and commercial impact in operational language.'
          }
        ]
      },
      {
        title: 'Action planning and exports',
        purpose:
          'Finish the audit by converting findings into ownership, narrative, and a report the client can actually use.',
        steps: [
          'Use Generate action plan when you want the tool to suggest structured follow-up items.',
          'Use Draft narrative when you want the tool to create first-pass summary, quick wins, priority actions, and next-visit guidance.',
          'Use Export PDF when the report preview is ready and you want a printable document.'
        ],
        fields: [
          {
            label: 'Action items',
            guidance:
              'Give each action a clear title, area, owner, due date, and impact note so follow-up becomes manageable.'
          },
          {
            label: 'Quick wins, long-term strategy, priority actions, recommended follow-up',
            guidance:
              'Keep these practical. Use one line per idea so the exported report is easy to read.'
          }
        ]
      }
    ],
    tips: [
      'Use the preset buttons when the visit is clearly margin-led, operations-led, or opening-led.',
      'If weekly sales are missing, covers and average spend are still worth entering because they unlock a working estimate.',
      'The PDF export is a print-ready document, so use the browser print dialog to save it as a PDF.'
    ],
    prompts: [
      'How do I run an audit with the least admin?',
      'What should I fill in first on the audit page?',
      'How do the scorecard and controls register work?'
    ]
  },
  {
    key: 'menu',
    title: 'Menu Builder',
    routeLabel: 'Menu engineering',
    summary:
      'The menu builder is the commercial menu-engineering workspace. Use it to structure sections, cost dishes, add ingredients, review GP, and export a client-ready menu report.',
    quickStart: [
      'Start with menu information and the default target GP.',
      'Build sections before adding dishes so the menu structure stays clean.',
      'Cost each dish properly with ingredients and use the live report to review the commercial story.'
    ],
    sections: [
      {
        title: 'Menu information',
        purpose: 'Set the menu project context before adding dishes.',
        fields: [
          {
            label: 'Menu name, site name, review date',
            guidance: 'Use the real project name and site so the saved work and exported report stay clear.'
          },
          {
            label: 'Client link',
            guidance: 'Link the project to the client whenever possible so account history stays connected.'
          },
          {
            label: 'Default target GP',
            guidance: 'Use the target that should apply to most dishes, then adjust dish-level targets only when needed.'
          }
        ]
      },
      {
        title: 'Commercial overview',
        purpose:
          'Use this area to understand whether the menu is commercially healthy before going dish by dish.'
      },
      {
        title: 'Section management',
        purpose:
          'Create the menu structure first. Separate sections clearly so dish analysis is easier to manage and explain.'
      },
      {
        title: 'Dish editor',
        purpose: 'This is where each menu item becomes commercially useful.',
        fields: [
          {
            label: 'Dish name',
            guidance: 'Use the trading name the client will recognise.'
          },
          {
            label: 'Sell price',
            guidance: 'Enter the live or proposed sell price for that dish.'
          },
          {
            label: 'Target GP',
            guidance: 'Use the specific target for that dish if it should differ from the menu default.'
          },
          {
            label: 'Mix',
            guidance: 'Use this as the sales-mix or popularity input if you want stronger commercial interpretation.'
          },
          {
            label: 'Notes',
            guidance: 'Use notes for commercial or product context, not full ingredient detail.'
          }
        ]
      },
      {
        title: 'Ingredients',
        purpose: 'Ingredients are what make costing accurate.',
        fields: [
          {
            label: 'Ingredient name',
            guidance: 'Use the real ingredient or component name.'
          },
          {
            label: 'Qty used',
            guidance: 'Enter how much of the pack is used in one dish.'
          },
          {
            label: 'Pack qty',
            guidance: 'Enter the full purchase pack size in the same unit logic as qty used.'
          },
          {
            label: 'Pack cost',
            guidance: 'Use the current purchase cost so the dish GP calculation means something.'
          }
        ]
      },
      {
        title: 'Reports and exports',
        purpose:
          'Use the live menu report to review the commercial case and export a printable PDF when the project is ready.'
      }
    ],
    tips: [
      'Build the menu structure before deep costing so you do not lose track of where dishes belong.',
      'Dish GP is only as good as the ingredient inputs, so pack quantities and pack costs matter.',
      'Use the report preview before exporting so you can catch obvious pricing or naming issues.'
    ],
    prompts: [
      'How do I cost a dish properly?',
      'What should I put in the ingredient fields?',
      'How should I use the menu builder workflow?'
    ]
  },
  {
    key: 'not-found',
    title: 'Page guide',
    routeLabel: 'Support',
    summary:
      'If you land somewhere unexpected, use the guide to jump back into dashboard, clients, audit, or menu work.',
    quickStart: [
      'Open the dashboard to get back to the main workspace.',
      'Use clients if you need account setup or CRM work.',
      'Use audit or menu if you are resuming delivery work.'
    ],
    sections: [],
    tips: ['The main working pages are dashboard, clients, audit tool, and menu builder.'],
    prompts: ['What are the main pages in this app?', 'Where should I go next?']
  }
];

const pageKeywords: Record<AppHelpPage['key'], string[]> = {
  login: ['login', 'sign in', 'signin', 'password', 'email'],
  dashboard: ['dashboard', 'overview', 'command centre', 'command center', 'operations board'],
  clients: ['clients', 'crm', 'portfolio', 'new client'],
  'client-profile': ['client profile', 'account', 'invoice', 'billing', 'deals', 'timeline'],
  audit: ['audit', 'kitchen', 'scorecard', 'controls', 'waste', 'portion', 'ordering'],
  menu: ['menu', 'dish', 'ingredient', 'gp', 'pricing', 'costing'],
  'not-found': ['help', 'support']
};

function routeKey(pathname: string): AppHelpPage['key'] {
  if (pathname === '/login') return 'login';
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
  if (pathname === '/clients') return 'clients';
  if (pathname.startsWith('/clients/')) return 'client-profile';
  if (pathname === '/audit') return 'audit';
  if (pathname === '/menu') return 'menu';
  return 'not-found';
}

export function getAllHelpPages() {
  return helpPages;
}

export function getHelpPage(pathnameOrKey: string) {
  const key = pathnameOrKey.startsWith('/') ? routeKey(pathnameOrKey) : pathnameOrKey;
  return helpPages.find((page) => page.key === key) ?? helpPages[0];
}

export function getSuggestedPrompts(pathname: string) {
  return getHelpPage(pathname).prompts;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function uniqueTokens(value: string) {
  return [...new Set(tokenize(value))];
}

function buildEntries() {
  const entries: HelpEntry[] = [];

  for (const page of helpPages) {
    entries.push({
      page,
      title: page.title,
      body: [page.summary, ...page.quickStart, ...page.tips].join(' ')
    });

    for (const section of page.sections) {
      entries.push({
        page,
        section,
        title: `${page.title} - ${section.title}`,
        body: [section.purpose, ...(section.steps ?? [])].join(' ')
      });

      for (const field of section.fields ?? []) {
        entries.push({
          page,
          section,
          field,
          title: `${page.title} - ${section.title} - ${field.label}`,
          body: field.guidance
        });
      }
    }
  }

  return entries;
}

const helpEntries = buildEntries();

function scoreEntry(entry: HelpEntry, question: string, pathname: string) {
  const tokens = uniqueTokens(question);
  const haystack = `${entry.title} ${entry.body}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
  }

  if (entry.page.key === routeKey(pathname)) score += 4;

  for (const keyword of pageKeywords[entry.page.key]) {
    if (question.toLowerCase().includes(keyword)) score += 3;
  }

  if (entry.field && question.toLowerCase().includes(entry.field.label.toLowerCase())) {
    score += 6;
  }

  return score;
}

function relevantEntries(question: string, pathname: string) {
  return [...helpEntries]
    .map((entry) => ({ entry, score: scoreEntry(entry, question, pathname) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.entry);
}

function pageFromQuestion(question: string, pathname: string) {
  const lowered = question.toLowerCase();
  const explicitPage = helpPages.find((page) =>
    pageKeywords[page.key].some((keyword) => lowered.includes(keyword))
  );

  return explicitPage ?? getHelpPage(pathname);
}

export function createAssistantWelcome(pathname: string) {
  const page = getHelpPage(pathname);

  return `I can walk you through every page in this app and explain what each form field is for.\n\nYou are currently on ${page.title}. A good starting point here is:\n1. ${page.quickStart[0] ?? 'Open the main workflow for this page.'}\n2. ${page.quickStart[1] ?? 'Use the page sections from top to bottom.'}\n3. ${page.quickStart[2] ?? 'Export or save once the page is complete.'}`;
}

export function buildAssistantReply(question: string, pathname: string) {
  const trimmed = question.trim();
  const currentPage = getHelpPage(pathname);

  if (!trimmed) {
    return createAssistantWelcome(pathname);
  }

  const lowered = trimmed.toLowerCase();
  const targetPage = pageFromQuestion(trimmed, pathname);
  const matches = relevantEntries(trimmed, pathname);
  const isGeneric =
    /\b(help|how|use|start|page|form|fill|workflow|what do i do)\b/.test(lowered) ||
    trimmed.split(/\s+/).length <= 4;
  const fieldMatches = matches.filter((entry) => entry.field);
  const sectionMatches = matches.filter((entry) => entry.section && !entry.field);

  if (fieldMatches.length > 0) {
    const lines = fieldMatches.slice(0, 3).map((entry) => {
      const field = entry.field!;
      const section = entry.section!;
      return `${field.label} on ${targetPage.title} (${section.title}): ${field.guidance}`;
    });

    return `Here is the most relevant field guidance for ${targetPage.title}:\n\n- ${lines.join('\n- ')}\n\nBest next step: fill those fields first, then continue through the section in order.`;
  }

  if (isGeneric || matches.length === 0) {
    const lines = targetPage.quickStart.slice(0, 3).map((step, index) => `${index + 1}. ${step}`);
    const tips = targetPage.tips.slice(0, 2).map((tip) => `- ${tip}`).join('\n');
    return `${targetPage.title} is used for ${targetPage.summary}\n\nBest way to work through it:\n${lines.join('\n')}\n\nImportant tips:\n${tips}`;
  }

  const detailLines = [...sectionMatches, ...matches]
    .slice(0, 3)
    .map((entry) => {
      if (entry.section) {
        return `${entry.section.title}: ${entry.section.purpose}`;
      }

      return `${entry.page.title}: ${entry.body}`;
    });

  return `For ${targetPage.title}, the most relevant guidance is:\n\n- ${detailLines.join('\n- ')}\n\nBest next step: follow the page from top to bottom, save once the record is clean, and use the export buttons only after the live preview or data looks correct.`;
}
