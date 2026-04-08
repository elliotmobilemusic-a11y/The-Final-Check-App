import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/layout/PageIntro';
import { StatCard } from '../../components/ui/StatCard';
import {
  buildReportHeroHtml,
  openPrintableHtmlDocument
} from '../../features/clients/clientExports';
import { listClients } from '../../services/clients';
import {
  deleteLocalToolRecord,
  getLocalToolRecord,
  listLocalToolRecords,
  saveLocalToolRecord
} from '../../services/localToolStore';
import type {
  AuditActionItem,
  ClientRecord,
  LocalToolRecord,
  MysteryShopAuditState,
  MysteryShopObservation,
  MysteryShopScorecard
} from '../../types';
import { downloadText, safe, todayIso, uid } from '../../lib/utils';

const STORAGE_KEY = 'the-final-check-mystery-shop-audits-v1';

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

function buildMysteryShopReport(state: MysteryShopAuditState) {
  const calc = calculateMysteryShop(state);
  const actions = state.actionItems.filter((item) => safe(item.title));

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

    <section>
      <h2>Scorecard</h2>
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
      <div class="report-columns">
        <div><h3>Overall summary</h3><p>${safe(state.overallSummary) || 'No overall summary recorded.'}</p></div>
        <div><h3>First impression</h3><p>${safe(state.firstImpression) || 'No first-impression notes recorded.'}</p></div>
        <div><h3>Service story</h3><p>${safe(state.serviceStory) || 'No service notes recorded.'}</p></div>
        <div><h3>Food and drink</h3><p>${safe(state.foodAndDrink) || 'No product notes recorded.'}</p></div>
        <div><h3>Cleanliness and atmosphere</h3><p>${safe(state.cleanlinessNotes) || 'No cleanliness notes recorded.'}</p></div>
        <div><h3>Recommendations</h3><p>${safe(state.recommendations) || 'No recommendations recorded.'}</p></div>
      </div>
    </section>

    <section>
      <h2>Touchpoint observations</h2>
      ${
        state.observations.length
          ? `
        <table class="report-table">
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
      <h2>Action register</h2>
      ${
        actions.length
          ? `
        <table class="report-table">
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
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<MysteryShopAuditState>(() => createDefaultMysteryShopAudit());
  const [savedRecords, setSavedRecords] = useState<LocalToolRecord<MysteryShopAuditState>[]>([]);
  const [message, setMessage] = useState('Mystery shop audit ready.');

  const calc = useMemo(() => calculateMysteryShop(form), [form]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
    setSavedRecords(listLocalToolRecords<MysteryShopAuditState>(STORAGE_KEY));
  }, []);

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

  function refreshSaved() {
    setSavedRecords(listLocalToolRecords<MysteryShopAuditState>(STORAGE_KEY));
  }

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

  function handleSave() {
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
    refreshSaved();
    setMessage('Mystery shop audit saved.');
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this saved mystery shop audit?')) return;
    deleteLocalToolRecord(STORAGE_KEY, id);
    refreshSaved();
    if (form.id === id) {
      setForm(createDefaultMysteryShopAudit());
    }
    setMessage('Saved mystery shop audit deleted.');
  }

  function handleExportJson() {
    downloadText(
      `${safe(form.siteName || 'mystery-shop-audit').replace(/\s+/g, '-').toLowerCase()}.json`,
      JSON.stringify(form, null, 2),
      'application/json'
    );
  }

  function handleExportPrint() {
    openPrintableHtmlDocument(
      `${form.title || 'Mystery Shop Audit'} printout`,
      buildMysteryShopReport(form)
    );
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
              Print report
            </button>
            <button className="button button-secondary" onClick={handleExportJson}>
              Export JSON
            </button>
          </>
        }
        side={
          <div className="page-intro-summary">
            <span className="status-pill status-success">{calc.grade}</span>
            <strong>Guest experience score</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Overall</span>
                <strong>{calc.overallScore}/10</strong>
              </div>
              <div>
                <span>Low moments</span>
                <strong>{calc.lowMoments}</strong>
              </div>
              <div>
                <span>Actions</span>
                <strong>{calc.namedActions}</strong>
              </div>
            </div>
          </div>
        }
      />

      <section className="stats-grid compact">
        <StatCard label="Overall" value={`${calc.overallScore}/10`} hint="Average across all guest experience categories" />
        <StatCard label="Standout" value={String(calc.standoutMoments)} hint="Touchpoints scoring 8 or higher" />
        <StatCard label="Low moments" value={String(calc.lowMoments)} hint="Touchpoints scoring 5 or below" />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
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
            <div className="panel-body tool-action-list">
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
          </article>
        </div>

        <aside className="workspace-side">
          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Experience snapshot</h3>
                <p>Keep the live guest-experience score visible while you work.</p>
              </div>
              <span className="soft-pill">{calc.grade}</span>
            </div>
            <div className="mini-grid">
              <div className="mini-box">
                <span>Overall</span>
                <strong>{calc.overallScore}/10</strong>
              </div>
              <div className="mini-box">
                <span>Standout</span>
                <strong>{calc.standoutMoments}</strong>
              </div>
              <div className="mini-box">
                <span>Low</span>
                <strong>{calc.lowMoments}</strong>
              </div>
            </div>
            {clients.length > 0 ? (
              <Link className="button button-ghost" to="/clients">
                Back to clients
              </Link>
            ) : null}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Saved mystery shops</h3>
                <p className="muted-copy">Reopen or delete past guest-experience reviews.</p>
              </div>
            </div>
            <div className="panel-body">
              {savedRecords.length === 0 ? (
                <div className="muted-copy">No mystery shop audits saved yet.</div>
              ) : null}

              {savedRecords.map((record) => (
                <div className="saved-item" key={record.id}>
                  <div>
                    <strong>{record.title}</strong>
                    <div className="saved-meta">
                      {record.siteName} • {formatShortDate(record.reviewDate)} • {record.location || 'Location not set'}
                    </div>
                  </div>
                  <div className="saved-actions">
                    <Link className="button button-ghost" to={`/mystery-shop?load=${record.id}`}>
                      Open
                    </Link>
                    <button className="button button-secondary" onClick={() => handleDelete(record.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
