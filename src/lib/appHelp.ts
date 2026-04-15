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
  key:
    | 'login'
    | 'dashboard'
    | 'clients'
    | 'new-client'
    | 'client-profile'
    | 'audit'
    | 'food-safety'
    | 'mystery-shop'
    | 'menu'
    | 'settings'
    | 'not-found';
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
      'Use login to open your protected workspace. Once you are signed in, the app keeps you inside the main client, audit, menu, and settings flows.',
    quickStart: [
      'Enter the approved email attached to your workspace.',
      'Enter the current password for that account and submit the form.',
      'After sign-in, use the dashboard for overview work or jump straight into a client or audit workflow.'
    ],
    sections: [
      {
        title: 'Sign-in form',
        purpose: 'This form only exists to start a secure session.',
        fields: [
          {
            label: 'Email',
            guidance: 'Use the same email that should own the saved clients, linked reports, and working history.'
          },
          {
            label: 'Password',
            guidance: 'Use the current password for that account. If this fails, it is usually an account issue rather than a page workflow issue.'
          }
        ]
      },
      {
        title: 'After login',
        purpose: 'The app returns you to the protected workspace and remembers your current device preferences.',
        steps: [
          'Check the shell header to confirm you are in the correct account.',
          'Open dashboard for overall priorities or go directly into clients, audits, or menu work if you already know the next task.'
        ]
      }
    ],
    tips: [
      'Saved work is tied to the signed-in account, so start by confirming the email is correct.',
      'If you mainly work from one page, set the default landing page in settings after login.'
    ],
    prompts: [
      'How do I sign in?',
      'What should I do after login?',
      'Why is the dashboard the best place to start?'
    ]
  },
  {
    key: 'dashboard',
    title: 'Dashboard',
    routeLabel: 'Command centre',
    summary:
      'The dashboard is the high-level operating view. It shows workload, client pressure points, recent activity, and the quickest route into the next useful piece of work.',
    quickStart: [
      'Read the summary cards and command-centre blocks to understand workload and health.',
      'Use recent activity or spotlight areas to jump back into a saved client, audit, or menu project.',
      'Use the follow-up queue to decide what deserves attention next.'
    ],
    sections: [
      {
        title: 'Command centre',
        purpose:
          'This area gives you a fast read on the portfolio, live workstreams, upcoming reviews, and overall operating momentum.'
      },
      {
        title: 'Recent activity',
        purpose:
          'Use this when you want to resume work from the latest saved change rather than browsing manually.',
        steps: [
          'Open the newest relevant item if you are continuing existing work.',
          'Use the labels to understand whether the item belongs to CRM, audit, food safety, mystery shop, or menu work.'
        ]
      },
      {
        title: 'Quick-start links',
        purpose:
          'The dashboard is also a launch pad into the most common workflows such as adding a client or opening the audit tools.'
      }
    ],
    tips: [
      'Use dashboard to choose priorities, not to enter detailed records.',
      'If you notice clients without linked delivery work, open the client or tool page and connect the missing audit or menu project.'
    ],
    prompts: [
      'How should I use the dashboard each day?',
      'What is the best way to pick my next task from here?',
      'What do the recent activity sections mean?'
    ]
  },
  {
    key: 'clients',
    title: 'Clients',
    routeLabel: 'CRM list',
    summary:
      'The clients page is the portfolio view for the CRM. Use it to search, filter, sort, open client records, export account summaries, and create intake links for new accounts.',
    quickStart: [
      'Use Add new client when you need to create the base CRM record.',
      'Use portfolio controls to search, filter by status, and sort by urgency or account value.',
      'Open a client profile when you need deeper CRM, billing, portal, or linked-workstream management.'
    ],
    sections: [
      {
        title: 'Portfolio controls',
        purpose: 'Use the top controls to reduce admin and find the right account quickly.',
        fields: [
          {
            label: 'Search',
            guidance: 'Search by company, contact, location, industry, or tags when the portfolio is growing.'
          },
          {
            label: 'Status filter',
            guidance: 'Use this to isolate active accounts, prospects, onboarding work, or inactive records.'
          },
          {
            label: 'Sort',
            guidance: 'Pick the sort mode that matches the decision you are making, such as updated date, company, value, or review pressure.'
          }
        ]
      },
      {
        title: 'Client intake links',
        purpose:
          'Use intake links when you want a client or lead to complete their own onboarding information through a shareable form.',
        steps: [
          'Generate the intake link from the clients page when you want information collected outside the app.',
          'Send the link to the client and use the completed intake as the basis for the CRM record.'
        ]
      },
      {
        title: 'Client list',
        purpose:
          'This is the operational list for the portfolio. Use it to open the client hub, export records, or jump into the next commercial action.'
      }
    ],
    tips: [
      'Create the client before creating linked delivery work so audits and menus stay connected cleanly.',
      'Use intake links to reduce manual retyping when clients can supply the setup details themselves.',
      'Use review dates and tags honestly so the dashboard stays meaningful.'
    ],
    prompts: [
      'How do I use the clients page properly?',
      'What are intake links for?',
      'How should I use search, filters, and sorting?'
    ]
  },
  {
    key: 'new-client',
    title: 'New Client Setup',
    routeLabel: 'Create account',
    summary:
      'The new client page is for creating the base account record before delivery, billing, and portal work begin. Keep it clean so the rest of the app starts from a solid CRM foundation.',
    quickStart: [
      'Fill the core identity fields first so the account is recognisable everywhere in the app.',
      'Add relationship and review details that make follow-up easier later.',
      'Save the client, then continue into the full client profile for deeper CRM or billing work.'
    ],
    sections: [
      {
        title: 'Core account fields',
        purpose: 'These create the main CRM identity for the record.',
        fields: [
          {
            label: 'Company name',
            guidance: 'Use the trading name you want to see in CRM lists, linked tools, exports, and portal release screens.'
          },
          {
            label: 'Primary contact name, email, and phone',
            guidance: 'Use the day-to-day decision-maker or the best operational contact for follow-up.'
          },
          {
            label: 'Location',
            guidance: 'Use the most recognisable site or account location so the business is easy to identify later.'
          }
        ]
      },
      {
        title: 'Commercial and planning fields',
        purpose: 'These make the record more useful once it moves into active account management.',
        fields: [
          {
            label: 'Status and tier',
            guidance: 'Set the real relationship stage and service priority so the CRM stays honest.'
          },
          {
            label: 'Industry and website',
            guidance: 'Use clear business-type detail that helps with later reporting and account context.'
          },
          {
            label: 'Next review date',
            guidance: 'Use the next meaningful review date so the dashboard can surface timing pressure.'
          },
          {
            label: 'Tags and notes',
            guidance: 'Use tags for fast filtering and notes for useful context that should travel with the account.'
          }
        ]
      }
    ],
    tips: [
      'Keep setup clean and simple here, then use the client profile for deeper CRM detail.',
      'A good next review date makes follow-up much easier later.'
    ],
    prompts: [
      'How do I add a client properly?',
      'What should I fill in on the new client page first?',
      'Which fields matter most on setup?'
    ]
  },
  {
    key: 'client-profile',
    title: 'Client Profile',
    routeLabel: 'Client hub',
    summary:
      'The client profile is the full account hub. Use it for CRM, billing, invoices, tasks, timeline, linked delivery work, and client portal publishing.',
    quickStart: [
      'Complete core profile, relationship, and billing details first so the account is commercially usable.',
      'Use the lower CRM sections for contacts, sites, pipeline, tasks, and timeline management.',
      'Use the portal and release controls when you are ready to share reports or client-facing resources.'
    ],
    sections: [
      {
        title: 'Core profile and relationship',
        purpose: 'Keep this current because it becomes the account source of truth.',
        fields: [
          {
            label: 'Company details, status, tier, review date, and notes',
            guidance: 'These fields drive how the account appears across the dashboard, CRM, and exports.'
          },
          {
            label: 'Account owner, lead source, and relationship health',
            guidance: 'Use these honestly so commercial oversight stays reliable.'
          }
        ]
      },
      {
        title: 'CRM and billing controls',
        purpose:
          'Use these fields to support invoice drafts, payment terms, and account-level commercial management.',
        fields: [
          {
            label: 'Estimated monthly value',
            guidance: 'Use a realistic figure so the account can be prioritised sensibly.'
          },
          {
            label: 'Billing name, email, and address',
            guidance: 'Fill these exactly as they should appear on invoices and client-facing exports.'
          },
          {
            label: 'Payment terms, VAT number, and company number',
            guidance: 'These make billing cleaner and reduce avoidable invoice admin.'
          }
        ]
      },
      {
        title: 'Working CRM sections',
        purpose:
          'Pipeline, contacts, sites, tasks, timeline, goals, risks, and opportunities turn the page into an active account workspace rather than a static record.'
      },
      {
        title: 'Invoices and exports',
        purpose:
          'Use invoice drafts and exports when you need printable account or invoice outputs without rebuilding detail elsewhere.'
      },
      {
        title: 'Client portal and report release',
        purpose:
          'This section lets you publish a client-facing portal with released audits, food safety reviews, mystery shop work, menu reports, and payment-based visibility controls.',
        steps: [
          'Enable the portal when you want to prepare a client-facing link.',
          'Choose the visibility mode and hide any linked reports or menus that should stay private.',
          'Publish the portal once the welcome message, access rules, and released resources look right.'
        ]
      }
    ],
    tips: [
      'Use the client profile as the account control point once a client becomes active.',
      'Keep linked workstream visibility tidy before publishing the client portal.',
      'Complete billing details before serious invoice drafting or release.'
    ],
    prompts: [
      'How do I use the client profile as my main account hub?',
      'How does the client portal work?',
      'Where should I manage billing and invoices?'
    ]
  },
  {
    key: 'audit',
    title: 'Kitchen Profit Audit',
    routeLabel: 'Profit audit',
    summary:
      'The kitchen profit audit is the main operational and commercial audit tool. Use it to capture the visit, score the kitchen, log control gaps, generate actions, draft narrative, open the control panel, and export or share the finished report.',
    quickStart: [
      'Start with site details and trading context so the report has the right business picture.',
      'Add the commercial baseline and score the operation honestly so the biggest issues surface quickly.',
      'Finish with findings, actions, narrative, control review, and export or share once the live report is clean.'
    ],
    sections: [
      {
        title: 'Site and context setup',
        purpose: 'Set the identity of the audit and capture the operating environment before judging performance.',
        fields: [
          {
            label: 'Report title, business name, location, visit date, consultant, and site contact',
            guidance: 'These become part of the saved record and printed report, so keep them factual and clean.'
          },
          {
            label: 'Client profile and audit type',
            guidance: 'Link the audit to the right client and use the closest audit type so records stay searchable and clear.'
          },
          {
            label: 'Service style, trading days, supplier, covers, spend, team size',
            guidance: 'Use real operating detail because it shapes how the findings should be interpreted.'
          }
        ]
      },
      {
        title: 'Commercial baseline',
        purpose: 'Use the financial inputs to show how much margin pressure exists before recommendations are made.',
        fields: [
          {
            label: 'Weekly food sales, food cost, waste, labour, and target GP',
            guidance: 'Use the most reliable current numbers you have. These drive GP, loss, and improvement opportunity.'
          },
          {
            label: 'Ordering control',
            guidance: 'Set Low, Moderate, or High based on how disciplined the real purchasing and stock routine is.'
          }
        ]
      },
      {
        title: 'Scorecard and controls',
        purpose:
          'Use the scorecard for fast operational grading and the control register for clear evidence of whether systems are actually in place.',
        fields: [
          {
            label: 'Scorecard ratings',
            guidance: 'Use the live operating reality, not the intended standard.'
          },
          {
            label: 'Controls and evidence notes',
            guidance: 'Mark each control honestly and add short proof-based notes so follow-up does not become vague.'
          }
        ]
      },
      {
        title: 'Findings, actions, and narrative',
        purpose:
          'This is where the visit becomes a client-usable report. Capture real issues, generate actions, and turn observations into clear follow-up.',
        steps: [
          'Use the findings sections for waste, portioning, ordering, systems, and layout issues.',
          'Use Generate actions to create a structured starting point for follow-up.',
          'Use Draft narrative to produce first-pass summary, quick wins, and next-step commentary.'
        ]
      },
      {
        title: 'Control panel, export, and sharing',
        purpose:
          'Use the floating control button when you need a clean snapshot of readiness, system checks, and profit position. Export PDF or create a share link only after the report content looks right.'
      }
    ],
    tips: [
      'Use the audit from top to bottom the first time, then use the floating control panel for quick progress checks.',
      'Share links are best used once the live report reads cleanly and action owners are set.',
      'If weekly sales are unknown, covers and spend still help create a usable working estimate.'
    ],
    prompts: [
      'How do I run a kitchen profit audit with the least admin?',
      'What does the control panel on this page do?',
      'When should I export or create a share link?'
    ]
  },
  {
    key: 'food-safety',
    title: 'Food Safety Audit',
    routeLabel: 'Compliance review',
    summary:
      'The food safety audit is for compliance-focused site reviews. Use it to capture site context, assess key controls, record temperature checks, structure corrective actions, open the control panel, and export or share the finished review.',
    quickStart: [
      'Capture the site context and audit basics first so the review has a clear identity.',
      'Work through the control checks and temperature logs honestly, using pass, watch, fail, or not applicable where needed.',
      'Finish with action items, summary detail, and then export or share once the review reads clearly.'
    ],
    sections: [
      {
        title: 'Audit setup and context',
        purpose: 'Use the opening fields to anchor the compliance visit to the correct site and account.',
        fields: [
          {
            label: 'Title, business details, visit date, reviewer, and linked client',
            guidance: 'Keep these accurate because they drive both the saved record and the shared report.'
          }
        ]
      },
      {
        title: 'Compliance checks',
        purpose:
          'The core check list is the main evidence capture area for the audit. Use it to record whether food safety controls are passing, slipping, or failing.',
        fields: [
          {
            label: 'Check status and notes',
            guidance: 'Use concise notes that explain what you saw or what was missing so the action plan stays evidence-led.'
          }
        ]
      },
      {
        title: 'Temperature and operational records',
        purpose:
          'Use the temperature section for hot-hold, cooling, delivery, storage, and any other readings that support the compliance picture.'
      },
      {
        title: 'Actions, risk view, and control panel',
        purpose:
          'Finish the audit by recording corrective actions and use the floating control panel for a quick summary of risk, pass rate, and action volume.'
      },
      {
        title: 'Export and sharing',
        purpose:
          'Use Export PDF for a printable review and Create share link when you want to send the finished result directly to a client or stakeholder.'
      }
    ],
    tips: [
      'Use watch status when the control exists but is not reliable enough to count as a clean pass.',
      'The control panel is useful when you need a quick readiness and risk summary without scrolling through the whole page.',
      'Only share once the action list is specific and the evidence notes are clear.'
    ],
    prompts: [
      'How should I use the food safety audit page?',
      'What do pass, watch, and fail mean here?',
      'What is the floating audit controls panel for?'
    ]
  },
  {
    key: 'mystery-shop',
    title: 'Mystery Shop Audit',
    routeLabel: 'Guest journey',
    summary:
      'The mystery shop audit is for customer-experience reviews. Use it to score the guest journey, log observations, structure actions, review the control panel, and export or share the final report.',
    quickStart: [
      'Set the site and visit context first so the review is anchored correctly.',
      'Score each part of the guest journey honestly and capture standout and low moments as separate observations.',
      'Use the action and summary sections to turn the visit into a clear client-facing follow-up report.'
    ],
    sections: [
      {
        title: 'Visit setup',
        purpose: 'Use the opening fields to define the mystery shop record clearly.',
        fields: [
          {
            label: 'Title, business, date, reviewer, and linked client',
            guidance: 'Keep these accurate because they frame the report and later sharing.'
          }
        ]
      },
      {
        title: 'Scorecard',
        purpose:
          'Use the scorecard to rate arrival, service, product, cleanliness, atmosphere, and value with a consistent 0 to 10 approach.'
      },
      {
        title: 'Observations and actions',
        purpose:
          'Use observations for memorable moments and action items for follow-up work the client can actually act on.'
      },
      {
        title: 'Control panel, export, and share',
        purpose:
          'The floating control panel gives you a quick read on overall grade, score breakdown, and action volume. Use export and share once the report is presentable.'
      }
    ],
    tips: [
      'Capture standout and low moments separately so the report feels specific rather than generic.',
      'Use the control panel for a fast high-level summary during review.',
      'Create the share link after the narrative and actions are ready for client eyes.'
    ],
    prompts: [
      'How should I structure a mystery shop review?',
      'What is the best way to score the guest journey?',
      'What does the control panel show on this page?'
    ]
  },
  {
    key: 'menu',
    title: 'Menu Profit Engine',
    routeLabel: 'Menu engineering',
    summary:
      'The menu profit engine is for menu engineering and dish costing. Use it to structure sections, build dishes, cost ingredients, review margin signals, open the control panel, and export or share the finished menu report.',
    quickStart: [
      'Set the menu information and default target GP first.',
      'Create sections before adding dishes so the menu structure stays clean.',
      'Cost dishes properly with ingredients, then use the report and control panel to review pricing and profit opportunities.'
    ],
    sections: [
      {
        title: 'Project setup',
        purpose: 'Define the menu project before adding commercial detail.',
        fields: [
          {
            label: 'Menu name, site, review date, linked client, and default target GP',
            guidance: 'These fields create the project identity and set the default commercial benchmark.'
          }
        ]
      },
      {
        title: 'Sections and dishes',
        purpose:
          'Build the menu structure first, then add dishes with pricing and sales-mix context so the project stays readable.'
      },
      {
        title: 'Ingredients and costing',
        purpose:
          'Ingredient inputs are what make dish costing believable. Use real pack sizes, real costs, and sensible dish usage amounts.',
        fields: [
          {
            label: 'Qty used',
            guidance: 'Enter the amount used by one dish or portion.'
          },
          {
            label: 'Pack qty and pack cost',
            guidance: 'Use the real purchasing quantity and current purchase cost so GP calculations stay useful.'
          }
        ]
      },
      {
        title: 'Report, control panel, export, and share',
        purpose:
          'Use the live report to review weighted GP, watch dishes, and opportunity areas. Use the floating control panel for a compact snapshot, then export or share when the project is client-ready.'
      }
    ],
    tips: [
      'Build the structure before deep costing so dishes do not become disorganised.',
      'The control panel is useful for quick completion and insight checks without leaving your place.',
      'Dish GP quality depends on ingredient accuracy, so keep pack sizes and costs current.'
    ],
    prompts: [
      'How do I cost a dish properly?',
      'What is the best menu-builder workflow?',
      'What does the menu control panel help with?'
    ]
  },
  {
    key: 'settings',
    title: 'Settings',
    routeLabel: 'Profile and preferences',
    summary:
      'Settings controls your profile identity, visual theme, landing-page behaviour, motion preferences, and top-navigation behaviour on this device.',
    quickStart: [
      'Set display name and avatar first so the shell reflects your account properly.',
      'Choose the theme and motion settings that suit how you work.',
      'Set default landing page and navigation preferences so the app feels right when you return.'
    ],
    sections: [
      {
        title: 'Account profile',
        purpose: 'These fields control the visible identity used around the app shell and settings preview.',
        fields: [
          {
            label: 'Display name',
            guidance: 'Use the working name you want shown across the product.'
          },
          {
            label: 'Avatar image URL',
            guidance: 'Add a direct image URL for a profile image, or leave it blank to keep the initials avatar.'
          },
          {
            label: 'Avatar preview',
            guidance: 'Use the preview to confirm the account identity looks right before saving.'
          }
        ]
      },
      {
        title: 'Theme and motion',
        purpose: 'Use these controls to shape how the product feels on the current device.',
        fields: [
          {
            label: 'Theme selection',
            guidance: 'Choose the visual palette that feels best for your daily workflow.'
          },
          {
            label: 'Reduced motion',
            guidance: 'Turn this on if you want fewer motion effects and calmer transitions.'
          },
          {
            label: 'Auto-show navigation',
            guidance: 'Use this when you want the top navigation to respond to scrolling and activity automatically.'
          }
        ]
      },
      {
        title: 'Device workflow preferences',
        purpose: 'These controls shape how the app opens and behaves on this device.',
        fields: [
          {
            label: 'Default landing page',
            guidance: 'Choose the page you want to land on when no deeper redirect is waiting after sign-in.'
          }
        ]
      },
      {
        title: 'Password update',
        purpose: 'Only use this section when you genuinely want to rotate the current password.',
        fields: [
          {
            label: 'New password and confirmation',
            guidance: 'Leave these blank unless you are intentionally changing the password, and make sure both entries match.'
          }
        ]
      }
    ],
    tips: [
      'Theme and motion settings are remembered on this device, so different devices can feel different if needed.',
      'Use default landing page and auto-show navigation together to make the app feel more natural for your workflow.'
    ],
    prompts: [
      'How do I set up my profile and theme?',
      'What does auto-show navigation do?',
      'How should I use the settings page?'
    ]
  },
  {
    key: 'not-found',
    title: 'Page guide',
    routeLabel: 'Help',
    summary:
      'If you land somewhere unexpected, the fastest route back into useful work is through dashboard, clients, audits, menu, or settings.',
    quickStart: [
      'Use dashboard when you want the overall picture.',
      'Use clients when you need CRM, account setup, or portal work.',
      'Use audit, food safety, mystery shop, or menu when you are resuming delivery work.'
    ],
    sections: [],
    tips: ['The core workspaces are dashboard, clients, kitchen audit, food safety, mystery shop, menu, and settings.'],
    prompts: ['What are the main pages in this app?', 'Where should I go next?', 'Which page should I use for this job?']
  }
];

const pageKeywords: Record<AppHelpPage['key'], string[]> = {
  login: ['login', 'sign in', 'signin', 'password', 'email'],
  dashboard: ['dashboard', 'command centre', 'command center', 'overview', 'recent activity'],
  clients: ['clients', 'crm', 'portfolio', 'intake link', 'intake'],
  'new-client': ['new client', 'add client', 'create client', 'setup client'],
  'client-profile': ['client profile', 'account', 'billing', 'invoice', 'portal', 'released reports'],
  audit: ['audit', 'kitchen', 'profit audit', 'controls', 'narrative', 'generate actions'],
  'food-safety': ['food safety', 'compliance', 'temperature', 'pass watch fail', 'haccp'],
  'mystery-shop': ['mystery shop', 'guest journey', 'service score', 'observations'],
  menu: ['menu', 'dish', 'ingredient', 'gp', 'pricing', 'costing'],
  settings: ['settings', 'theme', 'avatar', 'display name', 'landing page', 'navigation'],
  'not-found': ['help', 'support']
};

function routeKey(pathname: string): AppHelpPage['key'] {
  if (pathname === '/login') return 'login';
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard';
  if (pathname === '/clients') return 'clients';
  if (pathname === '/clients/new') return 'new-client';
  if (pathname.startsWith('/clients/')) return 'client-profile';
  if (pathname === '/audit') return 'audit';
  if (pathname === '/food-safety') return 'food-safety';
  if (pathname === '/mystery-shop') return 'mystery-shop';
  if (pathname === '/menu') return 'menu';
  if (pathname.startsWith('/settings')) return 'settings';
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
      body: [page.summary, ...page.quickStart, ...page.tips, ...page.prompts].join(' ')
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

  return `I can guide you through every main workspace in this app, including CRM, kitchen audits, food safety, mystery shop, menu engineering, client portal release, and settings.\n\nYou are currently on ${page.title}. A strong starting point here is:\n1. ${page.quickStart[0] ?? 'Open the main workflow for this page.'}\n2. ${page.quickStart[1] ?? 'Work through the page in order.'}\n3. ${page.quickStart[2] ?? 'Save, export, or share only once the record looks clean.'}`;
}

export function buildAssistantReply(question: string, pathname: string) {
  const trimmed = question.trim();

  if (!trimmed) {
    return createAssistantWelcome(pathname);
  }

  const lowered = trimmed.toLowerCase();
  const targetPage = pageFromQuestion(trimmed, pathname);
  const matches = relevantEntries(trimmed, pathname);
  const isGeneric =
    /\b(help|how|use|start|page|form|fill|workflow|what do i do|where do i)\b/.test(lowered) ||
    trimmed.split(/\s+/).length <= 4;
  const fieldMatches = matches.filter((entry) => entry.field);
  const sectionMatches = matches.filter((entry) => entry.section && !entry.field);

  if (fieldMatches.length > 0) {
    const lines = fieldMatches.slice(0, 3).map((entry) => {
      const field = entry.field!;
      const section = entry.section!;
      return `${field.label} on ${entry.page.title} (${section.title}): ${field.guidance}`;
    });

    return `Here is the most relevant field guidance:\n\n- ${lines.join('\n- ')}\n\nBest next step: complete those fields first, then continue through that section in order.`;
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
        return `${entry.page.title} - ${entry.section.title}: ${entry.section.purpose}`;
      }

      return `${entry.page.title}: ${entry.body}`;
    });

  return `For ${targetPage.title}, the most relevant guidance is:\n\n- ${detailLines.join('\n- ')}\n\nBest next step: work from top to bottom, keep the record clean, and only export or share once the live content looks ready for someone else to read.`;
}
