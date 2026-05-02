import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { QuantityInput, CurrencyInput } from '../../components/ui/NumericInput';
import { PhotoEvidenceField } from '../../components/common/PhotoEvidenceField';
import { useActivityOverlay } from '../../context/ActivityOverlayContext';
import { selectableSitesForClient } from '../../features/clients/clientData';
import {
  buildActionRegisterHtml,
  buildCalloutHtml,
  buildChapterHtml,
  buildKpiHeroHtml,
  buildReportPhotoGalleryHtml,
  buildReportBodyHtml,
  buildReportCoverHtml,
  buildRecommendationListHtml,
  buildSectionHtml,
  buildScoreGridHtml,
  buildStoryCardsHtml
} from '../../reports/pdf';
import { downloadPdfWithFallback } from '../../services/pdfExport';
import { listClients } from '../../services/clients';
import {
  getMysteryShopAudit,
  saveMysteryShopAudit
} from '../../services/mysteryShopAudits';
import { readDraft, writeDraft } from '../../services/draftStore';
import { createMysteryShopShare } from '../../services/reportShares';
import { useBodyScrollLock } from '../../lib/useBodyScrollLock';
import { PageContainer, PageHeader } from '../../components/layout';
import { StatCard } from '../../components/ui/StatCard';
import { useVisitMode } from '../../lib/useVisitMode';
import { ControlPanelModal } from '../../components/layout/ControlPanelModal';
import type {
  AuditActionItem,
  AuditAreaSummary,
  AuditPhoto,
  ClientRecord,
  MysteryShopAuditState,
  MysteryShopObservation,
  MysteryShopScorecard
} from '../../types';
import { newUUID, safe, todayIso, uid } from '../../lib/utils';


const MYSTERY_SHOP_DRAFT_KEY = 'mystery-shop-audit-draft-v1';
const mysteryPhotoSections = {
  visit: 'Visit details',
  scorecard: 'Scorecard',
  journey: 'Guest journey',
  observations: 'Touchpoint observations',
  actions: 'Service action plan'
} as const;
const mysteryShopVisitSections = [
  { href: '#mystery-visit', label: 'Visit details' },
  { href: '#mystery-scorecard', label: 'Scorecard' },
  { href: '#mystery-notes', label: 'Journey notes' },
  { href: '#mystery-observations', label: 'Observations' },
  { href: '#mystery-actions', label: 'Action plan' }
];

function blankObservation(partial?: Partial<MysteryShopObservation>): MysteryShopObservation {
  return {
    id: uid('mystery-observation'),
    area: '',
    touchpoint: '',
    score: 7,
    note: '',
    ...partial
  };
}

function blankActionItem(partial?: Partial<AuditActionItem>): AuditActionItem {
  return {
    id: uid('mystery-action'),
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
    id: uid('mystery-area'),
    area: '',
    summary: '',
    actionPlan: '',
    ...partial
  };
}

function defaultScorecard(): MysteryShopScorecard {
  return {
    arrival: 7,
    service: 7,
    product: 7,
    cleanliness: 7,
    atmosphere: 7,
    value: 7
  };
}

function createDefaultMysteryShopAudit(): MysteryShopAuditState {
  return {
    title: 'Mystery Shop Audit',
    clientId: null,
    clientSiteId: null,
    siteName: '',
    location: '',
    visitDate: todayIso(),
    shopperName: 'Mystery shopper',
    visitWindow: 'Dinner visit',
    spendAmount: 0,
    overallSummary: '',
    firstImpression: '',
    serviceStory: '',
    foodAndDrink: '',
    cleanlinessNotes: '',
    recommendations: '',
    followUpDate: '',
    scorecard: defaultScorecard(),
    observations: [
      blankObservation({ area: 'Arrival', touchpoint: 'Exterior, greeting, and first welcome' }),
      blankObservation({ area: 'Service', touchpoint: 'Ordering, pace, and attentiveness' }),
      blankObservation({ area: 'Product', touchpoint: 'Food and drink quality' }),
      blankObservation({ area: 'Environment', touchpoint: 'Cleanliness, atmosphere, and bathrooms' })
    ],
    focusAreas: [blankAreaSummary()],
    actionItems: [blankActionItem()],
    photos: []
  };
}

function normalizeMysteryShopAudit(
  data?: Partial<MysteryShopAuditState> | null
): MysteryShopAuditState {
  const defaults = createDefaultMysteryShopAudit();
  return {
    ...defaults,
    ...data,
    scorecard: {
      ...defaults.scorecard,
      ...(data?.scorecard ?? {})
    },
    observations:
      data?.observations?.length
        ? data.observations.map((item) => blankObservation(item))
        : defaults.observations,
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

function calculateMysteryShop(state: MysteryShopAuditState) {
  const scoreValues = Object.values(state.scorecard);
  const overallScore =
    scoreValues.length > 0
      ? Number((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(1))
      : 0;
  const lowMoments = state.observations.filter((item) => item.score <= 5).length;
  const standoutMoments = state.observations.filter((item) => item.score >= 8).length;
  const namedActions = state.actionItems.filter((item) => safe(item.title)).length;
  const grade =
    overallScore >= 8.5 ? 'Excellent' : overallScore >= 7 ? 'Strong' : overallScore >= 5.5 ? 'Mixed' : 'Weak';

  return {
    overallScore,
    lowMoments,
    standoutMoments,
    namedActions,
    grade
  };
}

export function buildMysteryShopReport(state: MysteryShopAuditState) {
  const calc = calculateMysteryShop(state);
  const actions = state.actionItems.filter((item) => safe(item.title));
  const focusAreas = state.focusAreas.filter(
    (item) => safe(item.area) || safe(item.summary) || safe(item.actionPlan)
  );
  const standoutObservations = state.observations.filter((item) => item.score >= 8).slice(0, 5);
  const weakObservations = state.observations.filter((item) => item.score <= 5).slice(0, 5);
  const completedActions = actions.filter((item) => item.status === 'Done').length;
  const openActions = Math.max(actions.length - completedActions, 0);

  // ──────────────────────────────────────────────
  // COVER
  // ──────────────────────────────────────────────
  const coverHtml = buildReportCoverHtml({
    reportType: 'Mystery Shop Audit',
    clientName: safe(state.siteName) || 'Client Site',
    preparedDate: formatShortDate(state.visitDate),
    consultant: safe(state.shopperName) || 'The Final Check',
    summary:
      'Independent guest experience review with scoring, journey analysis, and service-improvement actions for management.',
    metrics: [
      { label: 'Overall Score', value: `${calc.overallScore}/10`, primary: true },
      { label: 'Grade', value: calc.grade },
      { label: 'Weak Moments', value: `${calc.lowMoments}` }
    ],
    details: [
      { label: 'Site', value: safe(state.siteName) },
      { label: 'Location', value: safe(state.location) },
      { label: 'Visit Window', value: safe(state.visitWindow) },
      { label: 'Spend', value: state.spendAmount > 0 ? `£${state.spendAmount.toFixed(2)}` : '' }
    ]
  });

  // ──────────────────────────────────────────────
  // PAGE 2 — EXPERIENCE OVERVIEW
  // Score as hero KPI; scorecard grid; standout vs weak
  // ──────────────────────────────────────────────
  const standoutHtml = standoutObservations.length
    ? `<div class="report-story-card">
        <h3>Standout moments</h3>
        <ul>
          ${standoutObservations
            .map(
              (item) =>
                `<li><strong>${safe(item.touchpoint) || 'Touchpoint'}</strong>${safe(item.note) ? ` — ${safe(item.note)}` : ''}</li>`
            )
            .join('')}
        </ul>
       </div>`
    : '';

  const weakHtml = weakObservations.length
    ? `<div class="report-story-card">
        <h3>Weak moments</h3>
        <ul>
          ${weakObservations
            .map(
              (item) =>
                `<li><strong>${safe(item.touchpoint) || 'Touchpoint'}</strong>${safe(item.note) ? ` — ${safe(item.note)}` : ''}</li>`
            )
            .join('')}
        </ul>
       </div>`
    : '';

  const overviewBody = `
    ${buildKpiHeroHtml(
      `${calc.overallScore}/10`,
      'Overall Guest Experience Score',
      `Grade: ${calc.grade}  ·  ${calc.standoutMoments} standout moment${calc.standoutMoments !== 1 ? 's' : ''}  ·  ${calc.lowMoments} weak moment${calc.lowMoments !== 1 ? 's' : ''}`
    )}

    ${buildSectionHtml(
      'Scorecard',
      buildScoreGridHtml([
        { label: 'Arrival', score: state.scorecard.arrival },
        { label: 'Cleanliness', score: state.scorecard.cleanliness },
        { label: 'Atmosphere', score: state.scorecard.atmosphere },
        { label: 'Service', score: state.scorecard.service },
        { label: 'Product', score: state.scorecard.product },
        { label: 'Value', score: state.scorecard.value }
      ]),
      'Category scoring across the full guest journey.'
    )}

    ${standoutHtml || weakHtml
      ? buildSectionHtml(
          'Key Moments',
          `<div class="pdf-2col">${standoutHtml}${weakHtml}</div>`,
          'Best and weakest observed touchpoints highlighted for management review.'
        )
      : ''}

    ${safe(state.overallSummary)
      ? buildSectionHtml('Experience Summary', `<p>${safe(state.overallSummary)}</p>`)
      : ''}

    ${safe(state.recommendations)
      ? buildSectionHtml(
          'Recommendations',
          buildRecommendationListHtml(
            safe(state.recommendations)
              ?.split(/\n+/)
              .filter(Boolean) ?? [],
            safe(state.recommendations) || ''
          ) || `<p>${safe(state.recommendations)}</p>`
        )
      : ''}

    ${buildCalloutHtml(
      `${completedActions} action${completedActions !== 1 ? 's' : ''} closed  ·  ${openActions} open${safe(state.followUpDate) ? `  ·  Follow-up: ${safe(state.followUpDate)}` : ''}`,
      { title: 'Action Progress', variant: openActions > 3 ? 'warn' : 'neutral' }
    )}

    ${buildReportPhotoGalleryHtml(state.photos, 'scorecard')}
  `;

  const overviewChapter = buildChapterHtml({
    kicker: 'Guest Experience',
    title: 'Performance Overview & Key Findings',
    lead:
      'Score summary, category scorecard, standout and weak moments, and the headline recommendations for management.',
    body: overviewBody
  });

  // ──────────────────────────────────────────────
  // PAGE 3 — GUEST JOURNEY & DETAIL
  // Narrative journey + touchpoint log + area plans + actions
  // ──────────────────────────────────────────────
  const journeyBody = `
    ${buildSectionHtml(
      'Guest Journey',
      buildStoryCardsHtml([
        { title: 'First Impression', body: state.firstImpression },
        { title: 'Service Story', body: state.serviceStory },
        { title: 'Food & Drink', body: state.foodAndDrink },
        { title: 'Cleanliness & Atmosphere', body: state.cleanlinessNotes }
      ]),
      'Narrative observations from arrival through to departure.'
    )}

    ${buildReportPhotoGalleryHtml(state.photos, 'journey')}

    ${state.observations.length
      ? buildSectionHtml(
          'Touchpoint Observations',
          `<table class="report-table report-table-compact">
            <thead>
              <tr>
                <th style="width: 22%">Area</th>
                <th style="width: 28%">Touchpoint</th>
                <th style="width: 10%">Score</th>
                <th>Observation</th>
              </tr>
            </thead>
            <tbody>
              ${state.observations
                .map(
                  (item) => `
                <tr>
                  <td>${safe(item.area) || 'General'}</td>
                  <td>${safe(item.touchpoint)}</td>
                  <td>${item.score}/10</td>
                  <td>${safe(item.note)}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`,
          'Detailed scoring and observations across all visited touchpoints.'
        )
      : ''}

    ${buildReportPhotoGalleryHtml(state.photos, 'observations')}

    ${focusAreas.length
      ? buildSectionHtml(
          'Area Summaries & Action Plans',
          `<div class="report-story-grid">
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
           </div>`,
          'Management-level reading of each area with the required follow-up response.'
        )
      : ''}

    ${buildSectionHtml('Action Register', buildActionRegisterHtml(actions))}

    ${buildReportPhotoGalleryHtml(state.photos, 'actions')}
  `;

  const journeyChapter = buildChapterHtml({
    kicker: 'Guest Journey',
    title: 'The Visit — Narrative, Observations & Actions',
    lead:
      'Detailed journey narrative, touchpoint scoring, area-level management plans, and the full action register.',
    body: journeyBody
  });

  return `${coverHtml}${buildReportBodyHtml([overviewChapter, journeyChapter])}`;
}

export function MysteryShopAuditPage() {
  const { runWithActivity } = useActivityOverlay();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { visitMode, toggleVisitMode } = useVisitMode();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<MysteryShopAuditState>(() =>
    (searchParams.get('load') || searchParams.get('new'))
      ? createDefaultMysteryShopAudit()
      : normalizeMysteryShopAudit(readDraft<MysteryShopAuditState>(MYSTERY_SHOP_DRAFT_KEY))
  );
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState('Mystery shop audit ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);
  const controlDrawerBodyRef = useRef<HTMLDivElement>(null);

  const calc = useMemo(() => calculateMysteryShop(form), [form]);
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
    writeDraft(MYSTERY_SHOP_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const state = location.state as { prefill?: Partial<MysteryShopAuditState>; fromSubmissionId?: string } | null;
    if (!state?.prefill) return;
    setForm((current) => normalizeMysteryShopAudit({ ...current, ...state.prefill }));
    setMessage('Audit prefilled from pre-visit questionnaire.');
    window.history.replaceState({}, '', window.location.href);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (!loadId) return;

    getMysteryShopAudit(loadId).then(record => {
      if (!record) return;

      setForm({
        ...normalizeMysteryShopAudit(record.data),
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

  function updateField<K extends keyof MysteryShopAuditState>(
    key: K,
    value: MysteryShopAuditState[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateScore(key: keyof MysteryShopScorecard, value: number) {
    setForm((current) => ({
      ...current,
      scorecard: {
        ...current.scorecard,
        [key]: value
      }
    }));
  }

  function updateObservation(id: string, key: keyof MysteryShopObservation, value: string | number) {
    setForm((current) => ({
      ...current,
      observations: current.observations.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function addPhotos(section: keyof typeof mysteryPhotoSections, photos: AuditPhoto[]) {
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

  function updateAction(id: string, key: keyof AuditActionItem, value: string) {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
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

  async function handleSave() {
    await runWithActivity(
      {
        kicker: 'Service pass',
        title: 'Saving mystery shop audit',
        detail: 'Packing away the service review so it is ready for follow-up and reporting.'
      },
      async () => {
         const record = await saveMysteryShopAudit({
           id: form.id || newUUID(),
           client_id: form.clientId ?? null,
           client_site_id: form.clientSiteId ?? null,
           title: form.title || 'Mystery Shop Audit',
           site_name: form.siteName || 'Unnamed site',
           location: form.location || '',
           review_date: form.visitDate || null,
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
        setMessage('Mystery shop audit saved.');
      },
      980
    );
  }

  function handleExportPrint() {
    void runWithActivity(
      {
        kicker: 'Preparing export',
        title: 'Building mystery shop PDF',
        detail: 'Formatting the guest journey review into a printable report.'
      },
      async () => {
        const title = `${form.title || 'Mystery Shop Audit'} printout`;
        await downloadPdfWithFallback(title, buildMysteryShopReport(form), title);
      }
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
          detail: 'Publishing a public link for this mystery shop audit report.'
        },
        () => createMysteryShopShare(form),
        900
      );
      setShareUrl(share.url);

      try {
        await navigator.clipboard.writeText(share.url);
        setMessage('Mystery shop share link created and copied to clipboard.');
      } catch {
        setMessage(`Mystery shop share link created: ${share.url}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the share link.');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <PageContainer size="wide" className={visitMode ? 'visit-mode' : ''}>
      <div className="page-stack">
        <PageHeader
          eyebrow="Audit tool"
          title="Mystery Shop Audit"
          description="Capture the full guest journey, score the experience, and turn weak moments into clear service actions."
          actions={
            <>
              <button className={`button ${visitMode ? 'button-primary' : 'button-secondary'}`} onClick={toggleVisitMode}>
                {visitMode ? 'Exit visit mode' : 'Visit mode'}
              </button>
              <button className="button button-primary" onClick={handleSave}>
                Save audit
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
              <span>Keep the guest-journey review moving with faster section access and cleaner onsite controls.</span>
            </div>
            <div className="visit-mode-toolbar-actions">
              <button className="button button-primary" onClick={handleSave}>
                Save now
              </button>
              <button className="button button-secondary" onClick={() => setControlModalOpen(true)}>
                Open controls
              </button>
            </div>
            <div className="visit-mode-toolbar-links">
              {mysteryShopVisitSections.map((section) => (
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
                    setMessage('Mystery shop share link copied to clipboard.');
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
        <StatCard label="Overall" value={`${calc.overallScore}/10`} hint="Average across all guest experience categories" />
        <StatCard label="Standout" value={String(calc.standoutMoments)} hint="Touchpoints scoring 8 or higher" />
        <StatCard label="Low moments" value={String(calc.lowMoments)} hint="Touchpoints scoring 5 or below" />
      </section>

      <section>
        <div>
          <article className="panel" id="mystery-visit">
            <div className="panel-header">
              <div>
                <h3>Visit details</h3>
                <p className="muted-copy">Set the visit context and commercial background for the guest journey review.</p>
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
                  <span>Visit date</span>
                  <input className="input" type="date" value={form.visitDate} onChange={(event) => updateField('visitDate', event.target.value)} />
                </label>
                <label className="field">
                  <span>Shopper</span>
                  <input className="input" value={form.shopperName} onChange={(event) => updateField('shopperName', event.target.value)} />
                </label>
                <label className="field">
                  <span>Visit window</span>
                  <input className="input" value={form.visitWindow} onChange={(event) => updateField('visitWindow', event.target.value)} />
                </label>
                <label className="field">
                  <span>Spend amount</span>
                  <CurrencyInput
                    value={form.spendAmount}
                    onChange={(val) => updateField('spendAmount', val ?? 0)}
                  />
                </label>
                <label className="field">
                  <span>Follow-up date</span>
                  <input className="input" type="date" value={form.followUpDate} onChange={(event) => updateField('followUpDate', event.target.value)} />
                </label>
              </div>
              {availableClientSites.length > 1 ? (
                <p className="muted-copy">
                  This client has multiple recorded sites. Pick the location you are visiting so the
                  mystery shop stays tied to the right site.
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
                onAddPhotos={(photos) => addPhotos('visit', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="visit"
                sectionLabel={mysteryPhotoSections.visit}
              />
            </div>
          </article>

          <article className="panel" id="mystery-scorecard">
            <div className="panel-header">
              <div>
                <h3>Scorecard</h3>
                <p className="muted-copy">Score the six core elements of the guest experience.</p>
              </div>
            </div>
            <div className="panel-body tool-score-grid">
              {Object.entries(form.scorecard).map(([key, value]) => (
                <label className="field tool-score-card" key={key}>
                  <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                  <QuantityInput
                    min={0}
                    max={10}
                    value={value}
                    onChange={(val) => updateScore(key as keyof MysteryShopScorecard, val ?? 0)}
                  />
                </label>
              ))}

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('scorecard', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="scorecard"
                sectionLabel={mysteryPhotoSections.scorecard}
              />
            </div>
          </article>

          <article className="panel" id="mystery-notes">
            <div className="panel-header">
              <div>
                <h3>Guest journey notes</h3>
                <p className="muted-copy">Record the full narrative of the visit from first impression to departure.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="form-grid two-columns">
                <label className="field">
                  <span>Overall summary</span>
                  <textarea className="input" value={form.overallSummary} onChange={(event) => updateField('overallSummary', event.target.value)} />
                </label>
                <label className="field">
                  <span>First impression</span>
                  <textarea className="input" value={form.firstImpression} onChange={(event) => updateField('firstImpression', event.target.value)} />
                </label>
                <label className="field">
                  <span>Service story</span>
                  <textarea className="input" value={form.serviceStory} onChange={(event) => updateField('serviceStory', event.target.value)} />
                </label>
                <label className="field">
                  <span>Food and drink</span>
                  <textarea className="input" value={form.foodAndDrink} onChange={(event) => updateField('foodAndDrink', event.target.value)} />
                </label>
                <label className="field">
                  <span>Cleanliness and atmosphere</span>
                  <textarea className="input" value={form.cleanlinessNotes} onChange={(event) => updateField('cleanlinessNotes', event.target.value)} />
                </label>
                <label className="field">
                  <span>Recommendations</span>
                  <textarea className="input" value={form.recommendations} onChange={(event) => updateField('recommendations', event.target.value)} />
                </label>
              </div>

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('journey', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="journey"
                sectionLabel={mysteryPhotoSections.journey}
              />
            </div>
          </article>

          <article className="panel" id="mystery-observations">
            <div className="panel-header">
              <div>
                <h3>Touchpoint observations</h3>
                <p className="muted-copy">Score individual guest moments and leave notes for each one.</p>
              </div>
            </div>
            <div className="panel-body tool-list">
              {form.observations.map((item) => (
                <div className="repeat-card" key={item.id}>
                  <div className="form-grid">
                    <label className="field">
                      <span>Area</span>
                      <input className="input" value={item.area} onChange={(event) => updateObservation(item.id, 'area', event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Touchpoint</span>
                      <input className="input" value={item.touchpoint} onChange={(event) => updateObservation(item.id, 'touchpoint', event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Score</span>
                      <QuantityInput
                        min={0}
                        max={10}
                        value={item.score}
                        onChange={(val) => updateObservation(item.id, 'score', val ?? 0)}
                      />
                    </label>
                    <label className="field">
                      <span>Observation</span>
                      <input className="input" value={item.note} onChange={(event) => updateObservation(item.id, 'note', event.target.value)} />
                    </label>
                  </div>
                </div>
              ))}

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('observations', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="observations"
                sectionLabel={mysteryPhotoSections.observations}
              />
            </div>
          </article>

          <article className="panel" id="mystery-actions">
            <div className="panel-header">
              <div>
                <h3>Service action plan</h3>
                <p className="muted-copy">Turn low moments into practical service and standards improvements.</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h3>Area summaries and action plans</h3>
                    <p className="muted-copy">Add focused area-by-area summary notes and action plans from the visit.</p>
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

              <PhotoEvidenceField
                onAddPhotos={(photos) => addPhotos('actions', photos)}
                onCaptionChange={updatePhotoCaption}
                onMessage={setMessage}
                onRemovePhoto={removePhoto}
                photos={form.photos}
                section="actions"
                sectionLabel={mysteryPhotoSections.actions}
              />
            </div>
          </article>
        </div>

      </section>

      <ControlPanelModal
        bodyRef={controlDrawerBodyRef}
        onClose={() => setControlModalOpen(false)}
        open={controlModalOpen}
        title="Mystery Shop Audit Controls"
      >

              <div className="audit-side-block">
                <div className="audit-side-title-row">
                  <h4>Overall grade</h4>
                  <span className="soft-pill">{calc.grade}</span>
                </div>
                <div className="audit-chip-row audit-chip-row-vertical" style={{marginTop: '12px'}}>
                  <div className="audit-chip">
                    <strong>Overall score</strong>
                    <span>{calc.overallScore}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Standout moments</strong>
                    <span>{calc.standoutMoments}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Low moments</strong>
                    <span>{calc.lowMoments}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Action items</strong>
                    <span>{calc.namedActions}</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Arrival</strong>
                    <span>{form.scorecard.arrival}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Service</strong>
                    <span>{form.scorecard.service}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Product</strong>
                    <span>{form.scorecard.product}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Cleanliness</strong>
                    <span>{form.scorecard.cleanliness}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Atmosphere</strong>
                    <span>{form.scorecard.atmosphere}/10</span>
                  </div>
                  <div className="audit-chip">
                    <strong>Value</strong>
                    <span>{form.scorecard.value}/10</span>
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
