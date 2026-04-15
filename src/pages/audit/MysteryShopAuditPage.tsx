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
import { readDraft, writeDraft } from '../../services/draftStore';
import { createMysteryShopShare } from '../../services/reportShares';
import type {
  AuditActionItem,
  AuditAreaSummary,
  ClientRecord,
  MysteryShopAuditState,
  MysteryShopObservation,
  MysteryShopScorecard
} from '../../types';
import { safe, todayIso, uid } from '../../lib/utils';

const STORAGE_KEY = 'the-final-check-mystery-shop-audits-v1';
const MYSTERY_SHOP_DRAFT_KEY = 'mystery-shop-audit-draft-v1';

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
    actionItems: [blankActionItem()]
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
  const standoutObservations = state.observations.filter((item) => item.score >= 8).slice(0, 4);
  const weakObservations = state.observations.filter((item) => item.score <= 5).slice(0, 4);

  return `
    ${buildReportHeroHtml({
      eyebrow: 'Mystery shop audit',
      title: safe(state.title) || 'Mystery Shop Audit',
      leadHtml: `<strong>${safe(state.siteName) || 'Unnamed site'}</strong>${
        safe(state.location) ? ` • ${safe(state.location)}` : ''
      }`,
      description:
        'Guest-experience review, scoring, and service-improvement actions prepared for management follow-up.',
      chips: [
        safe(state.visitWindow) || 'Guest visit',
        `${calc.overallScore}/10`,
        calc.grade
      ],
      cards: [
        { label: 'Visit date', value: formatShortDate(state.visitDate) },
        { label: 'Shopper', value: safe(state.shopperName) || 'Not recorded' },
        { label: 'Spend', value: state.spendAmount > 0 ? `GBP ${state.spendAmount.toFixed(2)}` : 'Not recorded' },
        {
          label: 'Overall score',
          value: `${calc.overallScore}/10`,
          detail: `${calc.standoutMoments} standout • ${calc.lowMoments} weak moments`
        }
      ]
    })}

    <div class="summary-grid">
      <div class="meta-card"><span>Overall score</span><strong>${calc.overallScore}/10</strong></div>
      <div class="meta-card"><span>Grade</span><strong>${calc.grade}</strong></div>
      <div class="meta-card"><span>Standout moments</span><strong>${calc.standoutMoments}</strong></div>
      <div class="meta-card"><span>Weak moments</span><strong>${calc.lowMoments}</strong></div>
      <div class="meta-card"><span>Spend</span><strong>${state.spendAmount > 0 ? `GBP ${state.spendAmount.toFixed(2)}` : 'Not recorded'}</strong></div>
      <div class="meta-card"><span>Named actions</span><strong>${calc.namedActions}</strong></div>
    </div>

    <section>
      <h2>Scorecard</h2>
      <p class="report-section-lead">Category scoring across arrival, service, product, and overall guest value.</p>
      <div class="report-grid columns-4">
        <div><strong>Arrival</strong><br />${state.scorecard.arrival}/10</div>
        <div><strong>Service</strong><br />${state.scorecard.service}/10</div>
        <div><strong>Product</strong><br />${state.scorecard.product}/10</div>
        <div><strong>Cleanliness</strong><br />${state.scorecard.cleanliness}/10</div>
        <div><strong>Atmosphere</strong><br />${state.scorecard.atmosphere}/10</div>
        <div><strong>Value</strong><br />${state.scorecard.value}/10</div>
      </div>
    </section>

    <section>
      <h2>Guest journey summary</h2>
      <p class="report-section-lead">Narrative notes from first impression through to recommendation and revisit intent.</p>
      <div class="report-story-grid">
        <div class="report-story-card"><h3>Overall summary</h3><p>${safe(state.overallSummary) || 'No overall summary recorded.'}</p></div>
        <div class="report-story-card"><h3>First impression</h3><p>${safe(state.firstImpression) || 'No first-impression notes recorded.'}</p></div>
        <div class="report-story-card"><h3>Service story</h3><p>${safe(state.serviceStory) || 'No service notes recorded.'}</p></div>
        <div class="report-story-card"><h3>Food and drink</h3><p>${safe(state.foodAndDrink) || 'No product notes recorded.'}</p></div>
        <div class="report-story-card"><h3>Cleanliness and atmosphere</h3><p>${safe(state.cleanlinessNotes) || 'No cleanliness notes recorded.'}</p></div>
        <div class="report-story-card"><h3>Recommendations</h3><p>${safe(state.recommendations) || 'No recommendations recorded.'}</p></div>
      </div>
    </section>

    <section>
      <h2>Key moments</h2>
      <p class="report-section-lead">Best and weakest observed touchpoints highlighted for management review.</p>
      <div class="report-story-grid">
        <div class="report-story-card">
          <h3>Standout moments</h3>
          ${
            standoutObservations.length
              ? `<ul>${standoutObservations
                  .map(
                    (item) =>
                      `<li><strong>${safe(item.touchpoint) || 'Touchpoint'}</strong>${safe(item.note) ? ` — ${safe(item.note)}` : ''}</li>`
                  )
                  .join('')}</ul>`
              : '<p>No standout moments recorded.</p>'
          }
        </div>
        <div class="report-story-card">
          <h3>Weak moments</h3>
          ${
            weakObservations.length
              ? `<ul>${weakObservations
                  .map(
                    (item) =>
                      `<li><strong>${safe(item.touchpoint) || 'Touchpoint'}</strong>${safe(item.note) ? ` — ${safe(item.note)}` : ''}</li>`
                  )
                  .join('')}</ul>`
              : '<p>No weak moments recorded.</p>'
          }
        </div>
      </div>
    </section>

    <section>
      <h2>Touchpoint observations</h2>
      <p class="report-section-lead">Detailed observation log across touchpoints, areas, and scoring.</p>
      ${
        state.observations.length
          ? `
        <table class="report-table report-table-compact">
          <thead>
            <tr>
              <th>Area</th>
              <th>Touchpoint</th>
              <th>Score</th>
              <th>Observation</th>
            </tr>
          </thead>
          <tbody>
            ${state.observations
              .map(
                (item) => `
              <tr>
                <td>${safe(item.area) || 'General'}</td>
                <td>${safe(item.touchpoint) || 'Touchpoint not set'}</td>
                <td>${item.score}/10</td>
                <td>${safe(item.note) || 'No note recorded'}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
          : '<p class="muted-copy">No mystery shop observations recorded.</p>'
      }
    </section>

    <section>
      <h2>Area summaries and action plans</h2>
      <p class="report-section-lead">Management-level reading of each area with the follow-up response required.</p>
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
      <p class="report-section-lead">Named follow-up actions, owners, and timing captured during the shop review.</p>
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

export function MysteryShopAuditPage() {
  const { runWithActivity } = useActivityOverlay();
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<MysteryShopAuditState>(() =>
    searchParams.get('load')
      ? createDefaultMysteryShopAudit()
      : normalizeMysteryShopAudit(readDraft<MysteryShopAuditState>(MYSTERY_SHOP_DRAFT_KEY))
  );
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState('Mystery shop audit ready.');
  const [shareUrl, setShareUrl] = useState('');
  const [controlModalOpen, setControlModalOpen] = useState(false);

  const calc = useMemo(() => calculateMysteryShop(form), [form]);
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
    writeDraft(MYSTERY_SHOP_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    const loadId = searchParams.get('load');
    if (!loadId) return;

    const record = getLocalToolRecord<MysteryShopAuditState>(STORAGE_KEY, loadId);
    if (!record) return;

    setForm({
      ...normalizeMysteryShopAudit(record.data),
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
        const record = saveLocalToolRecord<MysteryShopAuditState>(STORAGE_KEY, {
          id: form.id || uid('mystery-shop'),
          title: form.title || 'Mystery Shop Audit',
          siteName: form.siteName || 'Unnamed site',
          location: form.location || '',
          reviewDate: form.visitDate || '',
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
        openPrintableHtmlDocument(
          `${form.title || 'Mystery Shop Audit'} printout`,
          buildMysteryShopReport(form)
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
    <div className="page-stack">
      <PageIntro
        eyebrow="Audit tool"
        title="Mystery Shop Audit"
        description="Capture the full guest journey, score the experience, and turn weak moments into clear service actions."
        actions={
          <>
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
          <article className="panel">
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
                  <input className="input" type="number" value={form.spendAmount} onChange={(event) => updateField('spendAmount', Number(event.target.value))} />
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
            </div>
          </article>

          <article className="panel">
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
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="10"
                    value={value}
                    onChange={(event) =>
                      updateScore(key as keyof MysteryShopScorecard, Number(event.target.value))
                    }
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="panel">
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
            </div>
          </article>

          <article className="panel">
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
                      <input className="input" type="number" min="1" max="10" value={item.score} onChange={(event) => updateObservation(item.id, 'score', Number(event.target.value))} />
                    </label>
                    <label className="field">
                      <span>Observation</span>
                      <input className="input" value={item.note} onChange={(event) => updateObservation(item.id, 'note', event.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
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
            </div>
          </article>
        </div>

      </section>

      {controlModalOpen && (
        <div className="drawer-backdrop" style={{ zIndex: 1000 }} onClick={() => setControlModalOpen(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()}>
            <div style={{padding: '24px', height: '100%', overflow: 'auto'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                <h2 style={{fontSize: '24px', fontWeight: 700}}>Mystery Shop Audit Controls</h2>
                <button className="button button-secondary" onClick={() => setControlModalOpen(false)}>
                  Close ✕
                </button>
              </div>

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
