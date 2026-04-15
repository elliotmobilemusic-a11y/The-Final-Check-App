import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildReportHeroHtml,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import { listClients } from '../../services/clients';
import {
  getLocalToolRecord,
  saveLocalToolRecord
} from '../../services/localToolStore';
import { clearDraft, readDraft, writeDraft } from '../../services/draftStore';
import { createFoodSafetyShare } from '../../services/reportShares';
import type {
  AuditActionItem,
  AuditAreaSummary,
  ClientRecord,
  FoodSafetyAuditState,
  FoodSafetyCheckItem,
  FoodSafetyTemperatureItem
} from '../../types';
import { safe, todayIso, uid } from '../../lib/utils';

const STORAGE_KEY = 'the-final-check-food-safety-audits-v1';
const FOOD_SAFETY_DRAFT_KEY = 'food-safety-audit-draft-v1';

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
    actionItems: [blankActionItem()]
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
        : defaults.actionItems
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

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Food safety audit',
      title: safe(state.title) || 'Food Safety Audit',
      leadHtml: `<strong>${safe(state.siteName) || 'Unnamed site'}</strong>${
        safe(state.location) ? ` • ${safe(state.location)}` : ''
      }`,
      description:
        'Food safety readiness, compliance risk, and immediate actions prepared for site follow-up.',
      chips: [
        safe(state.servicePeriod) || 'Service review',
        calc.riskLabel,
        `${calc.failCount} fail${calc.failCount === 1 ? '' : 's'}`
      ],
      cards: [
        { label: 'Audit date', value: formatShortDate(state.auditDate) },
        { label: 'Auditor', value: safe(state.auditorName) || 'Not recorded' },
        { label: 'Site lead', value: safe(state.managerName) || 'Not recorded' },
        {
          label: 'Control pass rate',
          value: `${calc.completion}%`,
          detail: `${calc.passCount} pass • ${calc.watchCount} watch • ${calc.failCount} fail`
        }
      ]
    })}

    <div class="summary-grid">
      <div class="meta-card"><span>Risk position</span><strong>${calc.riskLabel}</strong></div>
      <div class="meta-card"><span>Control pass rate</span><strong>${calc.completion}%</strong></div>
      <div class="meta-card"><span>Checks reviewed</span><strong>${calc.passCount + calc.watchCount + calc.failCount}</strong></div>
      <div class="meta-card"><span>Fails / watches</span><strong>${calc.failCount} fail • ${calc.watchCount} watch</strong></div>
      <div class="meta-card"><span>Action progress</span><strong>${completedActions} closed • ${openActions} open</strong></div>
      <div class="meta-card"><span>Food hygiene rating</span><strong>${safe(state.hygieneRating) || 'Not recorded'}</strong></div>
    </div>

    <section>
      <h2>Audit overview</h2>
      <p class="report-section-lead">Site context, summary notes, and positive practice captured during the visit.</p>
      <div class="report-columns">
        <div>
          <h3>Audit summary</h3>
          <p>${safe(state.summary) || 'No summary recorded.'}</p>
        </div>
        <div>
          <h3>Good practice seen</h3>
          <p>${safe(state.goodPractice) || 'No good practice recorded.'}</p>
        </div>
      </div>
      <div class="report-grid columns-4">
        <div><strong>Site</strong><br />${safe(state.siteName) || 'Unnamed site'}</div>
        <div><strong>Location</strong><br />${safe(state.location) || 'Not recorded'}</div>
        <div><strong>Audit date</strong><br />${formatShortDate(state.auditDate)}</div>
        <div><strong>Service period</strong><br />${safe(state.servicePeriod) || 'Not recorded'}</div>
        <div><strong>Auditor</strong><br />${safe(state.auditorName) || 'Not recorded'}</div>
        <div><strong>Site lead</strong><br />${safe(state.managerName) || 'Not recorded'}</div>
        <div><strong>Active actions</strong><br />${openActions}</div>
        <div><strong>Closed actions</strong><br />${completedActions}</div>
      </div>
    </section>

    <section>
      <h2>Priority safety narrative</h2>
      <div class="report-story-grid">
        <div class="report-story-card">
          <h3>Critical concerns</h3>
          <p>${safe(state.criticalConcerns) || 'No critical concerns recorded.'}</p>
        </div>
        <div class="report-story-card">
          <h3>Immediate actions</h3>
          <p>${safe(state.immediateActions) || 'No immediate actions recorded.'}</p>
        </div>
      </div>
    </section>

    <section>
      <h2>Control check register</h2>
      <p class="report-section-lead">Core compliance checks with status and supporting audit notes.</p>
      ${
        checkRows.length
          ? `
        <table class="report-table report-table-compact">
          <thead>
            <tr>
              <th>Area</th>
              <th>Check</th>
              <th>Status</th>
              <th>Audit note</th>
            </tr>
          </thead>
          <tbody>
            ${checkRows
              .map(
                (item) => `
              <tr>
                <td>${safe(item.area) || 'General'}</td>
                <td>${safe(item.item) || 'Unnamed check'}</td>
                <td>${item.status}</td>
                <td>${safe(item.note) || 'No note recorded'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
          : '<p class="muted-copy">No checks recorded.</p>'
      }
    </section>

    <section>
      <h2>Temperature and holding checks</h2>
      <p class="report-section-lead">Temperature, hot-hold, cooling, and delivery controls reviewed during the visit.</p>
      ${
        temperatureRows.length
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
                <td>${safe(item.area) || 'Area not set'}</td>
                <td>${safe(item.reading) || 'Not recorded'}</td>
                <td>${safe(item.target) || 'Not recorded'}</td>
                <td>${safe(item.note) || 'No note recorded'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
          : '<p class="muted-copy">No temperature checks recorded.</p>'
      }
    </section>

    <section>
      <h2>Area summaries and action plans</h2>
      <p class="report-section-lead">Area-by-area summary notes and corrective actions for follow-up.</p>
      ${
        focusAreas.length
          ? `<div class="report-story-grid">
              ${focusAreas
                .map(
                  (item) => `
                <div class="report-story-card">
                  <h3>${safe(item.area) || 'General'}</h3>
                  <p>${safe(item.summary) || 'No summary recorded.'}</p>
                  <p class="muted-copy" style="margin-top: 8px;">${safe(item.actionPlan) || 'No action plan recorded.'}</p>
                </div>`
                )
                .join('')}
            </div>`
          : '<p class="muted-copy">No area summaries recorded.</p>'
      }
    </section>

    <section>
      <h2>Action register</h2>
      <p class="report-section-lead">Assigned actions, owners, and target dates for operational follow-up.</p>
      ${
        actions.length
          ? `
        <table class="report-table report-table-compact">
          <thead>
            <tr>
              <th>Action</th>
              <th>Area</th>
              <th>Priority</th>
              <th>Owner</th>
              <th>Due</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${actions
              .map(
                (item) => `
              <tr>
                <td>${safe(item.title) || 'Untitled action'}</td>
                <td>${safe(item.area) || 'General'}</td>
                <td>${item.priority}</td>
                <td>${safe(item.owner) || 'Not assigned'}</td>
                <td>${safe(item.dueDate) || 'Not set'}</td>
                <td>${item.status}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
          : '<p class="muted-copy">No action items recorded.</p>'
      }
    </section>
  `;
}

export function FoodSafetyAuditPage() {
  const { runWithActivity } = useActivityOverlay();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<FoodSafetyAuditState>(() =>
    searchParams.get('load')
      ? createDefaultFoodSafetyAudit()
      : normalizeFoodSafetyAudit(readDraft<FoodSafetyAuditState>(FOOD_SAFETY_DRAFT_KEY))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState('Food safety audit ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);

  const calc = useMemo(() => calculateFoodSafety(form), [form]);
  const activeClient = useMemo(
    () => clients.find((client) => client.id === form.clientId) ?? null,
    [clients, form.clientId]
  );
  const availableClientSites = useMemo(
    () => selectableSitesForClient(activeClient),
    [activeClient]
  );

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
  }, []);

  useEffect(() => {
    writeDraft(FOOD_SAFETY_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (!loadId) return;

    const record = getLocalToolRecord<FoodSafetyAuditState>(STORAGE_KEY, loadId);
    if (!record) return;

    setForm({
      ...normalizeFoodSafetyAudit(record.data),
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    });
    setMessage(`Loaded "${record.title}".`);
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
          const record = saveLocalToolRecord<FoodSafetyAuditState>(STORAGE_KEY, {
            id: form.id || uid('food-safety'),
            title: form.title || 'Food Safety Audit',
            siteName: form.siteName || 'Unnamed site',
            location: form.location || '',
            reviewDate: form.auditDate || '',
            data: form,
            createdAt: form.createdAt,
            updatedAt: form.updatedAt
          });

          setForm((current) => ({
            ...current,
            id: record.id,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt
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
        openPrintableHtmlDocument(
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
    <div className="page-stack">
      <PageIntro
        eyebrow="Audit tool"
        title="Food Safety Audit"
        description="Run a practical site food safety review with check registers, temperature evidence, immediate actions, and a printable follow-up report."
        actions={
          <>
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
          <article className="panel">
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
            </div>
          </article>

          <article className="panel">
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
            </div>
          </article>

          <article className="panel">
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
            </div>
          </article>

          <article className="panel">
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

      {controlModalOpen && (
        <div className="drawer-backdrop" style={{ zIndex: 1000 }} onClick={() => setControlModalOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div style={{padding: '24px', height: '100%', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h2 style={{fontSize: '24px', fontWeight: 700}}>Food Safety Audit Controls</h2>
                <button className="button button-secondary" onClick={() => setControlModalOpen(false)}>
                  Close ✕
                </button>
              </div>

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

            </div>
          </div>
        </div>
      )}

      <div style={{position: 'fixed', bottom: '24px', left: '24px', zIndex: 900}}>
        <button className="button button-primary" style={{
          minWidth: '180px',
          minHeight: '54px',
          padding: '0 24px',
          boxShadow: '0 20px 60px rgba(11, 18, 27, 0.24)'
        }} onClick={() => setControlModalOpen(true)}>
          📊 Audit Controls
        </button>
      </div>

    </div>
  );
}
