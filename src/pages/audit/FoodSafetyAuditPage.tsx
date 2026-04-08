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
  FoodSafetyAuditState,
  FoodSafetyCheckItem,
  FoodSafetyTemperatureItem,
  LocalToolRecord
} from '../../types';
import { downloadText, lines, safe, todayIso, uid } from '../../lib/utils';

const STORAGE_KEY = 'the-final-check-food-safety-audits-v1';

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
      blankFoodSafetyTemperature({ area: 'Walk-in fridge', target: '0C to 5C' }),
      blankFoodSafetyTemperature({ area: 'Freezer', target: '-18C or below' }),
      blankFoodSafetyTemperature({ area: 'Hot hold', target: '63C or above' })
    ],
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

function buildFoodSafetyReport(state: FoodSafetyAuditState) {
  const calc = calculateFoodSafety(state);
  const actions = state.actionItems.filter((item) => safe(item.title));
  const checkRows = state.checks.filter((item) => safe(item.item));
  const temperatureRows = state.temperatureLog.filter(
    (item) => safe(item.area) || safe(item.reading) || safe(item.target) || safe(item.note)
  );

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

    <section>
      <h2>Audit overview</h2>
      <div class="report-grid">
        <div><strong>Service period</strong><br />${safe(state.servicePeriod) || 'Not recorded'}</div>
        <div><strong>Food hygiene rating</strong><br />${safe(state.hygieneRating) || 'Not recorded'}</div>
        <div><strong>Overall summary</strong><br />${safe(state.summary) || 'No summary recorded'}</div>
        <div><strong>Good practice seen</strong><br />${safe(state.goodPractice) || 'No good practice recorded'}</div>
      </div>
    </section>

    <section>
      <h2>Control check register</h2>
      ${
        checkRows.length
          ? `
        <table class="report-table">
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
      ${
        temperatureRows.length
          ? `
        <table class="report-table">
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
      <h2>Critical concerns</h2>
      <p>${safe(state.criticalConcerns) || 'No critical concerns recorded.'}</p>
    </section>

    <section>
      <h2>Immediate actions</h2>
      <p>${safe(state.immediateActions) || 'No immediate actions recorded.'}</p>
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

export function FoodSafetyAuditPage() {
  const [searchParams] = useSearchParams();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [form, setForm] = useState<FoodSafetyAuditState>(() => createDefaultFoodSafetyAudit());
  const [savedRecords, setSavedRecords] = useState<LocalToolRecord<FoodSafetyAuditState>[]>([]);
  const [message, setMessage] = useState('Food safety audit ready.');

  const calc = useMemo(() => calculateFoodSafety(form), [form]);

  useEffect(() => {
    listClients().then(setClients).catch(() => {});
    setSavedRecords(listLocalToolRecords<FoodSafetyAuditState>(STORAGE_KEY));
  }, []);

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

  function updateAction(id: string, key: keyof AuditActionItem, value: string) {
    setForm((current) => ({
      ...current,
      actionItems: current.actionItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function refreshSaved() {
    setSavedRecords(listLocalToolRecords<FoodSafetyAuditState>(STORAGE_KEY));
  }

  function handleSave() {
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
    refreshSaved();
    setMessage('Food safety audit saved.');
  }

  function handleDelete(id: string) {
    if (!window.confirm('Delete this saved food safety audit?')) return;
    deleteLocalToolRecord(STORAGE_KEY, id);
    refreshSaved();
    if (form.id === id) {
      setForm(createDefaultFoodSafetyAudit());
    }
    setMessage('Saved food safety audit deleted.');
  }

  function handleExportJson() {
    downloadText(
      `${safe(form.siteName || 'food-safety-audit').replace(/\s+/g, '-').toLowerCase()}.json`,
      JSON.stringify(form, null, 2),
      'application/json'
    );
  }

  function handleExportPrint() {
    openPrintableHtmlDocument(
      `${form.title || 'Food Safety Audit'} printout`,
      buildFoodSafetyReport(form)
    );
  }

  const suggestedClient = clients.find((client) => client.company_name === form.siteName);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="Audit tool"
        title="Food Safety Audit"
        description="Run a practical site food safety review with check registers, temperature evidence, immediate actions, and a printable follow-up report."
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
            <span className="status-pill status-warning">{calc.riskLabel}</span>
            <strong>Food safety status</strong>
            <p>{message}</p>
            <div className="page-intro-summary-list">
              <div>
                <span>Pass rate</span>
                <strong>{calc.completion}%</strong>
              </div>
              <div>
                <span>Fails</span>
                <strong>{calc.failCount}</strong>
              </div>
              <div>
                <span>Actions</span>
                <strong>{calc.totalActions}</strong>
              </div>
            </div>
          </div>
        }
      />

      <section className="stats-grid compact">
        <StatCard label="Pass" value={String(calc.passCount)} hint="Checks marked as compliant" />
        <StatCard label="Watch" value={String(calc.watchCount)} hint="Needs monitoring or follow-up" />
        <StatCard label="Fail" value={String(calc.failCount)} hint="Immediate action needed" />
      </section>

      <section className="workspace-grid">
        <div className="workspace-main">
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
                <p className="muted-copy">Record cold chain, freezer, and hot hold evidence during the visit.</p>
              </div>
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

        <aside className="workspace-side">
          <article className="feature-card">
            <div className="feature-top">
              <div>
                <h3>Audit snapshot</h3>
                <p>Use this side panel to keep the risk picture visible while you work.</p>
              </div>
              <span className="soft-pill">{calc.riskLabel}</span>
            </div>
            <div className="mini-grid">
              <div className="mini-box">
                <span>Pass rate</span>
                <strong>{calc.completion}%</strong>
              </div>
              <div className="mini-box">
                <span>Fails</span>
                <strong>{calc.failCount}</strong>
              </div>
              <div className="mini-box">
                <span>Done</span>
                <strong>{calc.completedActions}/{Math.max(calc.totalActions, 1)}</strong>
              </div>
            </div>
            {suggestedClient ? (
              <Link className="button button-ghost" to="/clients">
                Back to clients
              </Link>
            ) : null}
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h3>Saved audits</h3>
                <p className="muted-copy">Reopen or clear previous food safety reviews.</p>
              </div>
            </div>
            <div className="panel-body">
              {savedRecords.length === 0 ? (
                <div className="muted-copy">No food safety audits saved yet.</div>
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
                    <Link className="button button-ghost" to={`/food-safety?load=${record.id}`}>
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
