import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '../../components/layout';
import { StatCard } from '../../components/ui/StatCard';
import { useVisitMode } from '../../lib/useVisitMode';
import { PhotoEvidenceField } from '../../components/common/PhotoEvidenceField';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildActionRegisterHtml,
  buildCalloutHtml,
  buildChapterHtml,
  buildReportPhotoGalleryHtml,
  buildReportBodyHtml,
  buildReportCoverHtml,
  buildSectionHtml,
  buildSummaryGridHtml,
  buildStoryCardsHtml,
  buildStatusCell,
  openPdfDocument,
} from '../../reports/pdf';
import { listClients } from '../../services/clients';
import {
  getFoodSafetyAudit,
  saveFoodSafetyAudit
} from '../../services/foodSafetyAudits';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { createFoodSafetyShare } from '../../services/reportShares';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { ControlPanelModal } from '../../components/layout/ControlPanelModal';
import type {
  AuditActionItem,
  AuditAreaSummary,
  AuditPhoto,
  ClientRecord,
  FoodSafetyAuditState,
  FoodSafetyCheckItem,
  FoodSafetyTemperatureItem
} from '../../types';
import { newUUID, safe, todayIso, uid } from '../../lib/utils';


const FOOD_SAFETY_DRAFT_KEY = 'food-safety-audit-draft-v1';
const foodSafetyPhotoSections = {
  overview: 'Audit overview',
  checks: 'Control checks',
  temperature: 'Temperature evidence',
  actions: 'Summary and actions'
} as const;
const foodSafetyVisitSections = [
  { href: '#food-safety-site', label: 'Site details' },
  { href: '#food-safety-checks', label: 'Checks' },
  { href: '#food-safety-temperature', label: 'Temperature log' },
  { href: '#food-safety-summary', label: 'Summary and actions' }
];

function blankFoodSafetyCheck(partial?: Partial<FoodSafetyCheckItem>): FoodSafetyCheckItem {
  return {
    id: uid('fs-check'),
    area: '',
    item: '',
    status: 'Watch',
    note: '',
    ...partial
  };
}

function blankFoodSafetyTemperature(
  partial?: Partial<FoodSafetyTemperatureItem>
): FoodSafetyTemperatureItem {
  return {
    id: uid('fs-temp'),
    area: '',
    reading: '',
    target: '',
    note: '',
    ...partial
  };
}

function blankActionItem(partial?: Partial<AuditActionItem>): AuditActionItem {
  return {
    id: uid('fs-action'),
    title: '',
    area: '',
    priority: 'Medium',
    owner: '',
    dueDate: '',
    status: 'Open',
    impact: '',
    ...partial
  };
}

function blankAreaSummary(partial?: Partial<AuditAreaSummary>): AuditAreaSummary {
  return {
    id: uid('fs-area'),
    area: '',
    summary: '',
    actionPlan: '',
    ...partial
  };
}

function defaultFoodSafetyChecks() {
  return [
    blankFoodSafetyCheck({
      area: 'Cleanliness',
      item: 'Overall cleanliness'
    }),
    blankFoodSafetyCheck({
      area: 'Storage',
      item: 'Food storage'
    }),
    blankFoodSafetyCheck({
      area: 'Labelling',
      item: 'Date labelling'
    }),
    blankFoodSafetyCheck({
      area: 'Allergens',
      item: 'Allergens'
    }),
    blankFoodSafetyCheck({
      area: 'Pest Control',
      item: 'Pest control in place'
    }),
    blankFoodSafetyCheck({
      area: 'Waste',
      item: 'Bin areas'
    }),
    blankFoodSafetyCheck({
      area: 'Deliveries',
      item: 'Delivery areas'
    }),
    blankFoodSafetyCheck({
      area: 'Hand Wash',
      item: 'Hand wash basins'
    }),
    blankFoodSafetyCheck({
      area: 'Hand Wash',
      item: 'Soap'
    }),
    blankFoodSafetyCheck({
      area: 'Hand Wash',
      item: 'Means to dry hands'
    }),
    blankFoodSafetyCheck({
      area: 'Due Diligence',
      item: 'Due diligence check'
    })
  ];
}

function createDefaultFoodSafetyAudit(): FoodSafetyAuditState {
  return {
    title: 'Food Safety Audit',
    clientId: null,
    clientSiteId: null,
    siteName: '',
    location: '',
    auditDate: todayIso(),
    auditorName: 'Jason Wardill',
    managerName: '',
    servicePeriod: 'Lunch service',
    hygieneRating: '',
    summary: '',
    goodPractice: '',
    criticalConcerns: '',
    immediateActions: '',
    followUpDate: '',
    checks: defaultFoodSafetyChecks(),
    temperatureLog: [
      blankFoodSafetyTemperature({ area: 'Walk-in fridge 1', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Walk-in fridge 2', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Prep fridge', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Dessert or dairy fridge', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Freezer', target: '-18C or below' }),
      blankFoodSafetyTemperature({ area: 'Hot hold', target: '63C or above' }),
      blankFoodSafetyTemperature({ area: 'Cooked food probe', target: '75C or above' }),
      blankFoodSafetyTemperature({ area: 'Cooling check', target: '63C to 20C in 2 hours, 20C to 5C in 4 hours' }),
      blankFoodSafetyTemperature({ area: 'Delivery chilled goods', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Delivery frozen goods', target: '-18C or below' })
    ],
    focusAreas: [blankAreaSummary()],
    actionItems: [blankActionItem()],
    photos: []
  };
}

function normalizeFoodSafetyAudit(data?: Partial<FoodSafetyAuditState> | null): FoodSafetyAuditState {
  const defaults = createDefaultFoodSafetyAudit();

  return {
    ...defaults,
    ...data,
    checks:
      data?.checks?.length
        ? data.checks.map((item) => blankFoodSafetyCheck(item))
        : defaults.checks,
    temperatureLog:
      data?.temperatureLog?.length
        ? data.temperatureLog.map((item) => blankFoodSafetyTemperature(item))
        : defaults.temperatureLog,
    focusAreas:
      data?.focusAreas?.length
        ? data.focusAreas.map((item) => blankAreaSummary(item))
        : defaults.focusAreas,
    actionItems:
      data?.actionItems?.length
        ? data.actionItems.map((item) => blankActionItem(item))
        : defaults.actionItems,
    photos:
      data?.photos?.length
        ? data.photos.map((photo) => ({ ...photo, id: photo.id || uid('photo') }))
        : defaults.photos
  };
}

function formatShortDate(value?: string | null) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function calculateFoodSafety(state: FoodSafetyAuditState) {
  const activeChecks = state.checks.filter((item) => item.status !== 'N/A');
  const failCount = activeChecks.filter((item) => item.status === 'Fail').length;
  const watchCount = activeChecks.filter((item) => item.status === 'Watch').length;
  const passCount = activeChecks.filter((item) => item.status === 'Pass').length;
  const completedActions = state.actionItems.filter((item) => item.status === 'Done').length;
  const totalActions = state.actionItems.filter((item) => safe(item.title)).length;
  const completion =
    activeChecks.length > 0 ? Math.round((passCount / activeChecks.length) * 100) : 0;
  const riskLabel =
    failCount >= 3 ? 'High risk' : failCount > 0 || watchCount >= 3 ? 'At risk' : 'Controlled';

  return {
    failCount,
    watchCount,
    passCount,
    completion,
    completedActions,
    totalActions,
    riskLabel
  };
}

export function buildFoodSafetyReport(state: FoodSafetyAuditState) {
  const calc = calculateFoodSafety(state);
  const actions = state.actionItems.filter((item) => safe(item.title));
  const focusAreas = state.focusAreas.filter(
    (item) => safe(item.area) || safe(item.summary) || safe(item.actionPlan)
  );
  const checkRows = state.checks.filter((item) => safe(item.item));
  const temperatureRows = state.temperatureLog.filter(
    (item) => safe(item.area) || safe(item.reading) || safe(item.target) || safe(item.note)
  );
  const completedActions = actions.filter((item) => item.status === 'Done').length;
  const openActions = Math.max(actions.length - completedActions, 0);
  const riskVariant =
    calc.riskLabel === 'High risk' ? 'risk' : calc.riskLabel === 'At risk' ? 'warn' : 'good';

  // ──────────────────────────────────────────────
  // COVER
  // ──────────────────────────────────────────────
  const coverHtml = buildReportCoverHtml({
    reportType: 'Food Safety Audit',
    clientName: safe(state.siteName) || 'Client Site',
    preparedDate: formatShortDate(state.auditDate),
    consultant: safe(state.auditorName) || 'The Final Check',
    summary:
      'Food safety compliance review, risk assessment, and corrective action programme prepared for site management.',
    metrics: [
      { label: 'Risk Position', value: calc.riskLabel, primary: true },
      { label: 'Control Pass Rate', value: `${calc.completion}%` },
      { label: 'Failed Checks', value: `${calc.failCount}` }
    ],
    details: [
      { label: 'Site', value: safe(state.siteName) },
      { label: 'Location', value: safe(state.location) },
      { label: 'Service Period', value: safe(state.servicePeriod) },
      { label: 'Site Lead', value: safe(state.managerName) }
    ]
  });

  // ──────────────────────────────────────────────
  // PAGE 2 — RISK POSITION & IMMEDIATE ACTIONS
  // Risk callout anchors the page; immediate actions follow
  // ──────────────────────────────────────────────
  const riskSummaryText =
    calc.riskLabel === 'High risk'
      ? `HIGH RISK — ${calc.failCount} failed check${calc.failCount !== 1 ? 's' : ''} and ${calc.watchCount} watch item${calc.watchCount !== 1 ? 's' : ''} require immediate corrective action before the next operational period.`
      : calc.riskLabel === 'At risk'
        ? `AT RISK — ${calc.failCount > 0 ? `${calc.failCount} failed check${calc.failCount !== 1 ? 's' : ''} and ` : ''}${calc.watchCount} watch item${calc.watchCount !== 1 ? 's' : ''} identified. Corrective action required.`
        : `CONTROLLED — ${calc.completion}% of active checks passed. ${calc.watchCount > 0 ? `${calc.watchCount} watch item${calc.watchCount !== 1 ? 's' : ''} to monitor.` : 'No significant compliance concerns identified.'}`;

  const riskChapterBody = `
    ${buildCalloutHtml(riskSummaryText, { variant: riskVariant })}

    ${buildSummaryGridHtml([
      {
        label: 'Control Pass Rate',
        value: `${calc.completion}%`,
        detail: `${calc.passCount} passed of ${calc.passCount + calc.watchCount + calc.failCount} active checks.`
      },
      {
        label: 'Failed Checks',
        value: `${calc.failCount}`,
        detail: 'Checks requiring immediate corrective action.'
      },
      {
        label: 'Watch Items',
        value: `${calc.watchCount}`,
        detail: 'Checks at risk — monitor and review before next service.'
      },
      {
        label: 'Actions',
        value: `${completedActions} closed / ${openActions} open`,
        detail: 'Follow-up actions captured in this audit.'
      },
      ...(safe(state.hygieneRating)
        ? [{ label: 'Hygiene Rating', value: safe(state.hygieneRating) || '' }]
        : [])
    ])}

    ${safe(state.criticalConcerns)
      ? buildCalloutHtml(safe(state.criticalConcerns), {
          title: 'Critical Concerns',
          variant: 'risk'
        })
      : ''}

    ${safe(state.immediateActions)
      ? buildSectionHtml(
          'Immediate Actions Required',
          `<p>${safe(state.immediateActions)}</p>`
        )
      : ''}

    ${safe(state.summary)
      ? buildSectionHtml('Audit Summary', `<p>${safe(state.summary)}</p>`)
      : ''}

    ${buildReportPhotoGalleryHtml(state.photos, 'overview')}
  `;

  const riskChapter = buildChapterHtml({
    kicker: 'Risk Assessment',
    title: 'Compliance Position & Urgent Response',
    lead: 'Client-facing view of the current food safety risk, control performance, and the corrective response required.',
    body: riskChapterBody
  });

  // ──────────────────────────────────────────────
  // PAGE 3 — CONTROL CHECK REGISTER
  // Coloured status cells; grouped by fail/watch/pass ordering
  // ──────────────────────────────────────────────
  const failChecks = checkRows.filter((c) => c.status === 'Fail');
  const watchChecks = checkRows.filter((c) => c.status === 'Watch');
  const passChecks = checkRows.filter((c) => c.status === 'Pass');
  const naChecks = checkRows.filter((c) => c.status === 'N/A');
  const orderedChecks = [...failChecks, ...watchChecks, ...passChecks, ...naChecks];

  const checksBody = checkRows.length
    ? `
      ${buildCalloutHtml(
        `${calc.passCount} pass  ·  ${calc.watchCount} watch  ·  ${calc.failCount} fail  ·  ${naChecks.length} N/A  —  ${checkRows.length} checks total.`,
        { variant: riskVariant }
      )}
      <table class="report-table report-table-compact">
        <thead>
          <tr>
            <th style="width: 28%">Area</th>
            <th style="width: 36%">Check</th>
            <th style="width: 14%">Status</th>
            <th>Audit Note</th>
          </tr>
        </thead>
        <tbody>
          ${orderedChecks
            .map(
              (item) => `
            <tr>
              <td>${safe(item.area) || 'General'}</td>
              <td>${safe(item.item) || 'Unnamed check'}</td>
              <td>${buildStatusCell(item.status)}</td>
              <td>${safe(item.note)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      ${buildReportPhotoGalleryHtml(state.photos, 'checks')}`
    : '';

  const checksChapter = checksBody
    ? buildChapterHtml({
        kicker: 'Compliance Register',
        title: 'Control Check Results',
        lead: `Compliance checks conducted during the visit. Fails and watches listed first for management attention.`,
        body: checksBody
      })
    : '';

  // ──────────────────────────────────────────────
  // PAGE 4 — TEMPERATURE & GOOD PRACTICE
  // ──────────────────────────────────────────────
  const temperatureBody = temperatureRows.length
    ? `
      <table class="report-table report-table-compact">
        <thead>
          <tr>
            <th>Area</th>
            <th>Reading</th>
            <th>Target</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${temperatureRows
            .map(
              (item) => `
            <tr>
              <td>${safe(item.area)}</td>
              <td>${safe(item.reading)}</td>
              <td>${safe(item.target)}</td>
              <td>${safe(item.note)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
      ${buildReportPhotoGalleryHtml(state.photos, 'temperature')}`
    : '';

  const goodPracticeCards = buildStoryCardsHtml([
    { title: 'Good Practice Observed', body: state.goodPractice }
  ]);

  const tempAndContextBody = [temperatureBody, goodPracticeCards]
    .filter(Boolean)
    .join('');

  const temperatureChapter = tempAndContextBody
    ? buildChapterHtml({
        kicker: 'Temperature & Context',
        title: 'Temperature Controls & Positive Observations',
        lead: 'Temperature, hot-hold, cooling, and delivery controls — plus good practice noted during the visit.',
        body: tempAndContextBody
      })
    : '';

  // ──────────────────────────────────────────────
  // PAGE 5 — AREA PLANS & ACTION REGISTER
  // ──────────────────────────────────────────────
  const actionBody = `
    ${focusAreas.length
      ? `<div class="report-story-grid">
          ${focusAreas
            .map(
              (item) => `
            <div class="report-story-card">
              <h3>${safe(item.area) || 'General'}</h3>
              ${safe(item.summary) ? `<p>${safe(item.summary)}</p>` : ''}
              ${safe(item.actionPlan)
                ? `<p style="margin-top: 8px; color: var(--pdf-muted-strong); font-size: 9.5pt;">${safe(item.actionPlan)}</p>`
                : ''}
            </div>`
            )
            .join('')}
         </div>`
      : ''}
    ${buildSectionHtml('Action Register', buildActionRegisterHtml(actions))}
    ${safe(state.followUpDate)
      ? buildCalloutHtml(`Follow-up visit: ${safe(state.followUpDate)}`, {
          title: 'Next Review',
          variant: 'neutral'
        })
      : ''}
    ${buildReportPhotoGalleryHtml(state.photos, 'actions')}
  `;

  const actionChapter = buildChapterHtml({
    kicker: 'Follow-Up',
    title: 'Area Plans & Action Register',
    lead: 'Area-by-area summary, corrective actions, owners, and target dates for the operational follow-up programme.',
    body: actionBody
  });

  return `
    ${coverHtml}
    ${buildReportBodyHtml([riskChapter, checksChapter, temperatureChapter, actionChapter])}
  `;
}

export function FoodSafetyAuditPage() {
  const { runWithActivity } = useActivityOverlay();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { visitMode, toggleVisitMode } = useVisitMode();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<FoodSafetyAuditState>(() =>
    (searchParams.get('load') || searchParams.get('new'))
      ? createDefaultFoodSafetyAudit()
      : normalizeFoodSafetyAudit(readDraft<FoodSafetyAuditState>(FOOD_SAFETY_DRAFT_KEY))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState('Food safety audit ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const controlDrawerBodyRef = useRef<HTMLDivElement>(null);

  const calc = useMemo(() => calculateFoodSafety(form), [form]);
  const activeClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );

  useBodyScrollLock(controlModalOpen);

  useEffect(() => {
    if (!controlModalOpen) return;
    controlDrawerBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [controlModalOpen]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(FOOD_SAFETY_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const state = location.state as { prefill?: Partial<FoodSafetyAuditState>; fromSubmissionId?: string } | null;
    if (!state?.prefill) return;
    setForm((current) => normalizeFoodSafetyAudit({ ...current, ...state.prefill }));
    setMessage('Audit prefilled from pre-visit questionnaire.');
    window.history.replaceState({}, '', window.location.href);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (!loadId) return;

    getFoodSafetyAudit(loadId).then(record => {
      if (!record) return;

      setForm({
        ...normalizeFoodSafetyAudit(record.data),
        id: record.id,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      });
      setMessage(`Loaded "${record.title}".`);
    });
  }, [searchParams]);

  useEffect(() => {
    const queryClientId = searchParams.get('client');
    if (!queryClientId) return;

    setForm((current) => {
      if (current.clientId === queryClientId) return current;
      return { ...current, clientId: queryClientId };
    });
  }, [searchParams]);

  useEffect(() => {
    if (!form.clientId) return;

    const matchingSite = availableClientSites.find((site) => site.id === form.clientSiteId);
    const singleSite = availableClientSites.length === 1 ? availableClientSites[0] : null;

    if (matchingSite || !singleSite) return;

    setForm((current) => ({
      ...current,
      clientSiteId: singleSite.id,
      siteName:
        !current.siteName.trim() ? singleSite.name || activeClient?.company_name || '' : current.siteName,
      location:
        !current.location.trim() ? singleSite.address || activeClient?.location || '' : current.location
    }));
  }, [activeClient, availableClientSites, form.clientId, form.clientSiteId]);

  function updateField<K extends keyof FoodSafetyAuditState>(key: K, value: FoodSafetyAuditState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCheck(id: string, key: keyof FoodSafetyCheckItem, value: string) {
    setForm((current) => ({
      ...current,
      checks: current.checks.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    }));
  }

  function updateTemperature(id: string, key: keyof FoodSafetyTemperatureItem, value: string) {
    setForm((current) => ({
      ...current,
      temperatureLog: current.temperatureLog.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addPhotos(section: keyof typeof foodSafetyPhotoSections, photos: AuditPhoto[]) {
    setForm((current) => ({
      ...current,
      photos: [...current.photos, ...photos]
    }));
  }

  function updatePhotoCaption(photoId: string, caption: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.map((photo) => (photo.id === photoId ? { ...photo, caption } : photo))
    }));
  }

  function removePhoto(photoId: string) {
    setForm((current) => ({
      ...current,
      photos: current.photos.filter((photo) => photo.id !== photoId)
    }));
  }

  function addTemperatureReading() {
    setForm((current) => ({
      ...current,
      temperatureLog: [
        ...current.temperatureLog,
        blankFoodSafetyTemperature({ area: `Additional reading ${current.temperatureLog.length + 1}` })
      ]
    }));
  }

  function removeTemperatureReading(id: string) {
    setForm((current) => ({
      ...current,
      temperatureLog:
        current.temperatureLog.length > 1
          ? current.temperatureLog.filter((item) => item.id !== id)
          : current.temperatureLog
    }));
  }

  function updateFocusArea(id: string, key: keyof AuditAreaSummary, value: string) {
    setForm((current) => ({
      ...current,
      focusAreas: current.focusAreas.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addFocusArea() {
    setForm((current) => ({
      ...current,
      focusAreas: [...current.focusAreas, blankAreaSummary()]
    }));
  }

  function removeFocusArea(id: string) {
    setForm((current) => ({
      ...current,
      focusAreas:
        current.focusAreas.length > 1
          ? current.focusAreas.filter((item) => item.id !== id)
          : current.focusAreas
    }));
  }

  function updateAction(id: string, key: keyof AuditActionItem, value: string) {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  async function handleSave() {
    try {
      setIsSaving(true);
      await runWithActivity(
        {
          kicker: 'Final safety check',
          title: 'Saving food safety audit',
          detail: 'Updating the latest compliance record and keeping the saved version ready to reopen.'
        },
        async () => {
           const record = await saveFoodSafetyAudit({
             id: form.id || newUUID(),
             client_id: form.clientId ?? null,
             client_site_id: form.clientSiteId ?? null,
             title: form.title || 'Food Safety Audit',
             site_name: form.siteName || 'Unnamed site',
             location: form.location || '',
             review_date: form.auditDate || null,
             data: form,
             created_at: form.createdAt,
             updated_at: form.updatedAt
           });

           setForm((current) => ({
             ...current,
             id: record.id,
             createdAt: record.created_at,
             updatedAt: record.updated_at
           }));
          setMessage('Food safety audit saved.');
        },
        980
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleExportPrint() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building food safety PDF',
        detail: 'Formatting the food safety audit into a printable report.'
      },
      async () => {
        openPdfDocument(
          `${form.title || 'Food Safety Audit'} printout`,
          buildFoodSafetyReport(form)
        );
      },
      700
    );
  }

  async function handleShareReport() {
    try {
      setIsSharing(true);
      setShareUrl('');
      const share = await runWithActivity(
        {
          kicker: 'Opening pass',
          title: 'Creating share link',
          detail: 'Publishing a public link for this food safety audit report.'
        },
        () => createFoodSafetyShare(form),
        900
      );
      setShareUrl(share.url);

      try {
        await navigator.clipboard.writeText(share.url);
        setMessage('Food safety share link created and copied to clipboard.');
      } catch {
        setMessage(`Food safety share link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  function handleClientSelection(nextClientId: string | null) {
    const nextClient = clients.find((client) => client.id === nextClientId) ?? null;
    const nextSites = selectableSitesForClient(nextClient);
    const singleSite = nextSites.length === 1 ? nextSites[0] : null;

    setForm((current) => ({
      ...current,
      clientId: nextClientId,
      clientSiteId: singleSite?.id ?? null,
      siteName: singleSite
        ? singleSite.name || nextClient?.company_name || current.siteName
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.company_name || current.siteName
          : current.siteName,
      location: singleSite
        ? singleSite.address || nextClient?.location || current.location
        : nextClientId && current.clientId !== nextClientId
          ? nextClient?.location || current.location
          : current.location
    }));
  }

  function handleClientSiteSelection(nextSiteId: string | null) {
    const nextSite = availableClientSites.find((site) => site.id === nextSiteId) ?? null;
    setForm((current) => ({
      ...current,
      clientSiteId: nextSiteId,
      siteName: nextSite?.name || current.siteName,
      location: nextSite?.address || current.location
    }));
  }

  function newAudit() {
    clearDraft(FOOD_SAFETY_DRAFT_KEY);
    setForm(createDefaultFoodSafetyAudit());
    setMessage('Food safety audit ready.');
  }

  return (
    <PageContainer size="wide" className={visitMode ? 'visit-mode' : ''}>
      <div className="page-stack">
        <PageHeader
          eyebrow="Audit tool"
          title="Food Safety Audit"
          description="Run a practical site food safety review with check registers, temperature evidence, immediate actions, and a printable follow-up report."
          actions={
            <>
              <button className={`button ${visitMode ? 'button-primary' : 'button-secondary'}`} onClick={toggleVisitMode}>
                {visitMode ? 'Exit visit mode' : 'Visit mode'}
              </button>
              <button className="button button-secondary" onClick={newAudit}>
                New audit
              </button>
              <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save audit'}
              </button>
              <button className="button button-secondary" onClick={handleExportPrint}>
                Export PDF
              </button>
              <button className="button button-secondary" disabled={isSharing} onClick={handleShareReport}>
                {isSharing ? 'Creating link...' : 'Create share link'}
              </button>
            </>
          }
        />
      {visitMode ? (
        <section className="panel visit-mode-toolbar">
          <div className="panel-body visit-mode-toolbar-body">
            <div className="visit-mode-toolbar-copy">
              <strong>Day of Visit mode</strong>
              <span>Move quickly through checks and temperature evidence with bigger fields and sticky onsite controls.</span>
            </div>
            <div className="visit-mode-toolbar-actions">
              <button className="button button-primary" disabled={isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : 'Save now'}
              </button>
              <button className="button button-secondary" onClick={() => setControlModalOpen(true)}>
                Open controls
              </button>
            </div>
            <div className="visit-mode-toolbar-links">
              {foodSafetyVisitSections.map((section) => (
                <a className="audit-section-link" href={section.href} key={section.href}>
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel share-link-panel">
        <div className="panel-body stack gap-12">
          <div className="record-header-message">
            <span className="soft-pill">{message}</span>
            {shareUrl ? <span className="soft-pill">Share link ready</span> : null}
          </div>
          {shareUrl ? (
            <div className="share-link-row">
              <input className="input" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
              <button
                className="button button-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setMessage('Food safety share link copied to clipboard.');
                  } catch {
                    setMessage('Copy failed. You can still copy the link manually.');
                  }
                }}
                type="button"
              >
                Copy link
              </button>
              <a className="button button-primary" href={shareUrl} rel="noreferrer" target="_blank">
                Open link
              </a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="stats-grid compact">
        <StatCard label="Pass" value={String(calc.passCount)} hint="Checks marked as compliant" />
        <StatCard label="Watch" value={String(calc.watchCount)} hint="Needs monitoring or follow-up" />
        <StatCard label="Fail" value={String(calc.failCount)} hint="Immediate action needed" />
      </section>

      <section>
        <div>
          <article className="panel" id="food-safety-site">
            <div className="panel-header">
              <div>
                <h3>Site details</h3>
                <p className="muted-copy">Capture the core context before reviewing food safety controls.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="form-grid">
                <label className="field">
                  <span>Title</span>
                  <input className="input" value={form.title} onChange={(event) => updateField('title', event.target.value)} />
                </label>
                <label className="field">
                  <span>Site name</span>
                  <input className="input" value={form.siteName} onChange={(event) => updateField('siteName', event.target.value)} />
                </label>
                <label className="field">
                  <span>Client profile</span>
                  <select
                    className="input"
                    value={form.clientId || ''}
                    onChange={(event) => handleClientSelection(event.target.value || null)}
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.company_name}
                      </option>
                    ))}
                  </select>
                </label>
                {availableClientSites.length > 1 ? (
                  <label className="field">
                    <span>Client site</span>
                    <select
                      className="input"
                      value={form.clientSiteId || ''}
                      onChange={(event) => handleClientSiteSelection(event.target.value || null)}
                    >
                      <option value="">Select a site</option>
                      {availableClientSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {site.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="field">
                  <span>Location</span>
                  <input className="input" value={form.location} onChange={(event) => updateField('location', event.target.value)} />
                </label>
                <label className="field">
                  <span>Audit date</span>
                  <input className="input" type="date" value={form.auditDate} onChange={(event) => updateField('auditDate', event.target.value)} />
                </label>
                <label className="field">
                  <span>Auditor</span>
                  <input className="input" value={form.auditorName} onChange={(event) => updateField('auditorName', event.target.value)} />
                </label>
                <label className="field">
                  <span>Manager on duty</span>
                  <input className="input" value={form.managerName} onChange={(event) => updateField('managerName', event.target.value)} />
                </label>
                <label className="field">
                  <span>Service period</span>
                  <input className="input" value={form.servicePeriod} onChange={(event) => updateField('servicePeriod', event.target.value)} />
                </label>
                <label className="field">
                  <span>Hygiene rating</span>
                  <input className="input" value={form.hygieneRating} onChange={(event) => updateField('hygieneRating', event.target.value)} />
                </label>
                <label className="field">
                  <span>Follow-up date</span>
                  <input className="input" type="date" value={form.followUpDate} onChange={(event) => updateField('followUpDate', event.target.value)} />
                </label>
              </div>
              {availableClientSites.length > 1 ? (
                <p className="muted-copy">
                  This client has multiple recorded sites. Pick the location you are reviewing so the
                  food safety audit stays tied to the right site.
                </p>
              ) : null}
              {form.clientId ? (
                <div className="header-actions">
                  <Link className="button button-ghost" to={`/clients/${form.clientId}`}>
                    Open client profile
                  </Link>
                </div>
              ) : null}

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('overview', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="overview"
                sectionLabel={foodSafetyPhotoSections.overview}
              />
            </div>
          </article>

          <article className="panel" id="food-safety-checks">
            <div className="panel-header">
              <div>
                <h3>Control checks</h3>
                <p className="muted-copy">Mark each key control as pass, watch, fail, or not applicable.</p>
              </div>
            </div>
            <div className="panel-body tool-list">
              {form.checks.map((item) => (
                <div className="tool-check-row" key={item.id}>
                  <div className="tool-check-copy">
                    <strong>{item.item}</strong>
                    <span>{item.area}</span>
                  </div>
                  <div className="tool-check-controls">
                    <select className="input" value={item.status} onChange={(event) => updateCheck(item.id, 'status', event.target.value)}>
                      <option value="Pass">Pass</option>
                      <option value="Watch">Watch</option>
                      <option value="Fail">Fail</option>
                      <option value="N/A">N/A</option>
                    </select>
                    <input className="input" placeholder="Add audit note" value={item.note} onChange={(event) => updateCheck(item.id, 'note', event.target.value)} />
                  </div>
                </div>
              ))}

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('checks', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="checks"
                sectionLabel={foodSafetyPhotoSections.checks}
              />
            </div>
          </article>

          <article className="panel" id="food-safety-temperature">
            <div className="panel-header">
              <div>
                <h3>Temperature log</h3>
                <p className="muted-copy">Record every key fridge, freezer, delivery, cooking, cooling, and hot-hold reading during the visit.</p>
              </div>
              <button className="button button-ghost" onClick={addTemperatureReading}>
                Add reading
              </button>
            </div>
            <div className="panel-body tool-list">
              {form.temperatureLog.map((item) => (
                <div className="tool-temp-row" key={item.id}>
                  <label className="field">
                    <span>Area</span>
                    <input className="input" value={item.area} onChange={(event) => updateTemperature(item.id, 'area', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Reading</span>
                    <input className="input" value={item.reading} onChange={(event) => updateTemperature(item.id, 'reading', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Target</span>
                    <input className="input" value={item.target} onChange={(event) => updateTemperature(item.id, 'target', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Note</span>
                    <input className="input" value={item.note} onChange={(event) => updateTemperature(item.id, 'note', event.target.value)} />
                  </label>
                  <div className="tool-row-actions">
                    <button
                      className="button button-secondary"
                      disabled={form.temperatureLog.length === 1}
                      onClick={() => removeTemperatureReading(item.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('temperature', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="temperature"
                sectionLabel={foodSafetyPhotoSections.temperature}
              />
            </div>
          </article>

          <article className="panel" id="food-safety-summary">
            <div className="panel-header">
              <div>
                <h3>Summary and actions</h3>
                <p className="muted-copy">Capture what is working, what is unsafe, and what must happen next.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="form-grid two-columns">
                <label className="field">
                  <span>Overall summary</span>
                  <textarea className="input" value={form.summary} onChange={(event) => updateField('summary', event.target.value)} />
                </label>
                <label className="field">
                  <span>Good practice seen</span>
                  <textarea className="input" value={form.goodPractice} onChange={(event) => updateField('goodPractice', event.target.value)} />
                </label>
                <label className="field">
                  <span>Critical concerns</span>
                  <textarea className="input" value={form.criticalConcerns} onChange={(event) => updateField('criticalConcerns', event.target.value)} />
                </label>
                <label className="field">
                  <span>Immediate actions</span>
                  <textarea className="input" value={form.immediateActions} onChange={(event) => updateField('immediateActions', event.target.value)} />
                </label>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Area summaries and action plans</h3>
                    <p className="muted-copy">Add focused area-by-area summaries and next steps for the kitchen team.</p>
                  </div>
                  <button className="button button-ghost" onClick={addFocusArea} type="button">
                    Add an area
                  </button>
                </div>
                <div className="panel-body tool-action-list">
                  {form.focusAreas.map((item) => (
                    <div className="repeat-card" key={item.id}>
                      <div className="repeat-header">
                        <div>
                          <strong>{item.area || 'New area'}</strong>
                        </div>
                        <button
                          className="button button-secondary"
                          disabled={form.focusAreas.length === 1}
                          onClick={() => removeFocusArea(item.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="form-grid two-columns">
                        <label className="field">
                          <span>Area</span>
                          <input
                            className="input"
                            value={item.area}
                            onChange={(event) => updateFocusArea(item.id, 'area', event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Summary</span>
                          <textarea
                            className="input"
                            value={item.summary}
                            onChange={(event) => updateFocusArea(item.id, 'summary', event.target.value)}
                          />
                        </label>
                        <label className="field">
                          <span>Action plan</span>
                          <textarea
                            className="input"
                            value={item.actionPlan}
                            onChange={(event) => updateFocusArea(item.id, 'actionPlan', event.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('actions', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="actions"
                sectionLabel={foodSafetyPhotoSections.actions}
              />

              <div className="tool-action-list">
                {form.actionItems.map((item) => (
                  <div className="repeat-card" key={item.id}>
                    <div className="form-grid">
                      <label className="field">
                        <span>Action</span>
                        <input className="input" value={item.title} onChange={(event) => updateAction(item.id, 'title', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Area</span>
                        <input className="input" value={item.area} onChange={(event) => updateAction(item.id, 'area', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Owner</span>
                        <input className="input" value={item.owner} onChange={(event) => updateAction(item.id, 'owner', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Priority</span>
                        <select className="input" value={item.priority} onChange={(event) => updateAction(item.id, 'priority', event.target.value)}>
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Due date</span>
                        <input className="input" type="date" value={item.dueDate} onChange={(event) => updateAction(item.id, 'dueDate', event.target.value)} />
                      </label>
                      <label className="field">
                        <span>Status</span>
                        <select className="input" value={item.status} onChange={(event) => updateAction(item.id, 'status', event.target.value)}>
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>

      </section>

      <ControlPanelModal
        bodyRef={controlDrawerBodyRef}
        onClose={() => setControlModalOpen(false)}
        open={controlModalOpen}
        title="Food Safety Audit Controls"
      >

              <div className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Risk status</h4>
                  <span className="soft-pill">{calc.riskLabel}</span>
                </div>
                <div className="audit-chip-row audit-chip-row-vertical" style={{marginTop: '12px'}}>
                  <div className="audit-chip">
                    <strong>Passed checks</strong>
                    <span>{calc.passCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Watch items</strong>
                    <span>{calc.watchCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Failures</strong>
                    <span>{calc.failCount}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Pass rate</strong>
                    <span>{calc.completion}%</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Action items</strong>
                    <span>{calc.totalActions}</span>
                  </div>
                </div>
              </div>

      </ControlPanelModal>

        <div className="page-floating-controls">
          <button className="button button-primary control-dock-button" onClick={() => setControlModalOpen(true)}>
            📊 Audit Controls
          </button>
        </div>

      </div>
    </PageContainer>
  );
}
