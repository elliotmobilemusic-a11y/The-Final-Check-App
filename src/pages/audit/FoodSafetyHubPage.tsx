import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClients } from '../../services/clients';
import { readDraft } from '../../services/draftStore';
import { listFoodSafetyAudits } from '../../services/foodSafetyAudits';
import type { FoodSafetyAuditRecord } from '../../services/foodSafetyAudits';
import { listQuestionnaireSubmissions } from '../../services/preVisitQuestionnaires';
import type { ClientRecord, FoodSafetyAuditState, QuestionnaireSubmissionRecord } from '../../types';

const FOOD_SAFETY_DRAFT_KEY = 'food-safety-audit-draft-v1';

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function scoreFoodSafetyAudit(state: FoodSafetyAuditState) {
  const activeChecks = (state.checks ?? []).filter((item) => item.status !== 'N/A');
  const passCount = activeChecks.filter((item) => item.status === 'Pass').length;
  const failCount = activeChecks.filter((item) => item.status === 'Fail').length;
  const score = activeChecks.length > 0 ? Math.round((passCount / activeChecks.length) * 100) : 0;
  return { failCount, score };
}

export function FoodSafetyHubPage() {
  const [audits, setAudits] = useState<FoodSafetyAuditRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [submissions, setSubmissions] = useState<QuestionnaireSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const draft = useMemo(() => readDraft<FoodSafetyAuditState>(FOOD_SAFETY_DRAFT_KEY), []);
  const hasDraft = Boolean(
    draft?.siteName?.trim() || draft?.managerName?.trim() || draft?.location?.trim()
  );

  useEffect(() => {
    Promise.all([listFoodSafetyAudits(), listClients(), listQuestionnaireSubmissions()])
      .then(([auditRows, clientRows, subRows]) => {
        setAudits(auditRows);
        setClients(clientRows);
        setSubmissions(subRows.filter((s) => s.template_id === 'food_safety'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.company_name);
    return map;
  }, [clients]);

  const latestAudit = audits[0] ?? null;
  const pendingSubmissions = submissions.filter((s) => s.status !== 'used').slice(0, 4);
  const sitesReviewed = new Set(audits.map((audit) => audit.client_site_id || audit.site_name || audit.id)).size;
  const averageScore = audits.length
    ? Math.round(audits.reduce((total, audit) => total + scoreFoodSafetyAudit(audit.data).score, 0) / audits.length)
    : 0;

  return (
    <div className="page-stack food-safety-page">
      <section className="food-safety-hero">
        <div className="food-safety-hero-copy">
          <span className="food-safety-kicker">Food Safety</span>
          <h1>Food Safety Audit</h1>
          <p>
            Review hygiene standards, compliance controls, evidence, corrective actions, and site readiness.
          </p>
          <div className="food-safety-chip-row" aria-label="Food safety status">
            <span>{hasDraft ? '1 draft' : 'No drafts'}</span>
            <span>{audits.length} completed audits</span>
            <span>{audits.length} reports ready</span>
            <span>{sitesReviewed} sites reviewed</span>
          </div>
        </div>

        <div className="food-safety-hero-actions">
          <span>Compliance actions</span>
          <div className="food-safety-hero-action-grid">
            <Link className="button button-primary" to="/food-safety?new=1">
              New food safety audit
            </Link>
            {hasDraft && (
              <Link className="button button-secondary" to="/food-safety">
                Resume draft
              </Link>
            )}
            {latestAudit && (
              <Link className="button button-ghost" to={`/food-safety?load=${latestAudit.id}`}>
                Continue latest
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="food-safety-kpis" aria-label="Food safety performance">
        <article className="food-safety-kpi">
          <span className="food-safety-icon" aria-hidden="true">D</span>
          <div>
            <span>Active drafts</span>
            <strong>{hasDraft ? '1' : '0'}</strong>
            <p>{hasDraft ? 'Local draft ready to resume' : 'No local draft in progress'}</p>
          </div>
        </article>
        <article className="food-safety-kpi">
          <span className="food-safety-icon" aria-hidden="true">R</span>
          <div>
            <span>Completed reports</span>
            <strong>{audits.length}</strong>
            <p>{loading ? 'Checking saved audits' : 'Saved audit records'}</p>
          </div>
        </article>
        <article className="food-safety-kpi">
          <span className="food-safety-icon" aria-hidden="true">S</span>
          <div>
            <span>Sites reviewed</span>
            <strong>{sitesReviewed}</strong>
            <p>{clients.length} clients available</p>
          </div>
        </article>
        <article className="food-safety-kpi">
          <span className="food-safety-icon" aria-hidden="true">%</span>
          <div>
            <span>Average compliance</span>
            <strong>{averageScore}%</strong>
            <p>{audits.length ? 'Average pass rate' : 'No scored audits yet'}</p>
          </div>
        </article>
      </section>

      <div className="hub-layout food-safety-grid">
        {/* ─── Main: recent audits ───────────────────────────── */}
        <div className="hub-main-zone food-safety-main">
          <section className="panel food-safety-panel">
            <div className="panel-header food-safety-panel-header">
              <div>
                <h3>Recent audits</h3>
                <p className="muted-copy">
                  {loading
                    ? 'Loading…'
                    : `${audits.length} saved ${audits.length === 1 ? 'audit' : 'audits'}`}
                </p>
              </div>
              <Link className="button button-small button-ghost" to="/food-safety?new=1">
                New
              </Link>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading audits…</p>
              ) : audits.length === 0 ? (
                <div className="hub-empty">
                  <strong>No saved audits yet</strong>
                  <span>Create your first Food Safety Audit to see it here.</span>
                  <Link className="button button-small button-primary" to="/food-safety?new=1">
                    Start first audit
                  </Link>
                </div>
              ) : (
                <div className="hub-row-list food-safety-record-list">
                  {audits.slice(0, 12).map((audit) => (
                    <Link
                      key={audit.id}
                      to={`/food-safety?load=${audit.id}`}
                      className="hub-row food-safety-record-card"
                    >
                      <div className="hub-row-main">
                        <strong className="hub-row-title">
                          {audit.title || audit.site_name || 'Food Safety Audit'}
                        </strong>
                        {audit.client_id && clientMap.get(audit.client_id) ? (
                          <span className="hub-row-tag hub-row-tag--client">
                            {clientMap.get(audit.client_id)}
                          </span>
                        ) : null}
                        <span className="soft-pill">Report ready</span>
                      </div>
                      <div className="hub-row-meta">
                        <span>{scoreFoodSafetyAudit(audit.data).score}%</span>
                        <span>{scoreFoodSafetyAudit(audit.data).failCount} fail</span>
                        <span className="hub-row-date">
                          {fmtDate(audit.review_date ?? audit.updated_at ?? audit.created_at)}
                        </span>
                        <span className="hub-row-arrow" aria-hidden="true">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ─── Side: draft + clients + questionnaires ────────── */}
        <div className="hub-side-zone food-safety-side">
          {hasDraft && (
            <section className="panel hub-draft-panel food-safety-panel">
              <div className="panel-header food-safety-panel-header">
                <div>
                  <h3>Unsaved draft</h3>
                  <p className="muted-copy">Continue where you left off.</p>
                </div>
              </div>
              <div className="panel-body">
                <div className="hub-draft-copy">
                  <strong>{draft!.siteName?.trim() || 'Unnamed audit'}</strong>
                  {draft!.managerName?.trim() ? <span>{draft!.managerName.trim()}</span> : null}
                  {draft!.location?.trim() ? <span>{draft!.location.trim()}</span> : null}
                </div>
                <Link
                  className="button button-primary"
                  to="/food-safety"
                  style={{ marginTop: '12px', display: 'inline-flex' }}
                >
                  Resume draft
                </Link>
              </div>
            </section>
          )}

          <section className="panel food-safety-panel">
            <div className="panel-header food-safety-panel-header">
              <div>
                <h3>Start for a client</h3>
                <p className="muted-copy">Open a new audit with a client pre-linked.</p>
              </div>
            </div>
            <div className="panel-body">
              {loading ? (
                <p className="muted">Loading clients…</p>
              ) : clients.length === 0 ? (
                <div className="hub-empty compact">
                  <span>No clients yet.</span>
                  <Link className="button button-small button-ghost" to="/clients/new">
                    Add client
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hub-row-list">
                    {clients.slice(0, 7).map((client) => (
                      <Link
                        key={client.id}
                        to={`/food-safety?client=${client.id}&new=1`}
                        className="hub-row hub-row--compact food-safety-side-row"
                      >
                        <span className="hub-row-title">{client.company_name}</span>
                        <span className="hub-row-arrow" aria-hidden="true">→</span>
                      </Link>
                    ))}
                  </div>
                  {clients.length > 7 && (
                    <Link to="/clients" className="hub-see-all">
                      View all {clients.length} clients →
                    </Link>
                  )}
                </>
              )}
            </div>
          </section>

          {!loading && (
            <section className="panel food-safety-panel">
              <div className="panel-header food-safety-panel-header">
                <div>
                  <h3>Pre-visit questionnaires</h3>
                  <p className="muted-copy">Recent Food Safety submissions ready to use.</p>
                </div>
              </div>
              <div className="panel-body">
                {pendingSubmissions.length === 0 ? (
                  <div className="hub-empty compact">
                    <span>No pending questionnaire submissions.</span>
                    <Link className="button button-small button-ghost" to="/questionnaires">
                      All submissions
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="hub-row-list">
                      {pendingSubmissions.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/questionnaires/${sub.id}`}
                          className="hub-row hub-row--compact"
                        >
                          <div className="hub-row-main">
                            <span className="hub-row-title">
                              {sub.answers.businessName || sub.answers.contactName || 'Unnamed'}
                            </span>
                            <span className="hub-row-date">{fmtDate(sub.submitted_at)}</span>
                          </div>
                          <span className="hub-row-arrow" aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                    <Link to="/questionnaires" className="hub-see-all">
                      All submissions →
                    </Link>
                  </>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
